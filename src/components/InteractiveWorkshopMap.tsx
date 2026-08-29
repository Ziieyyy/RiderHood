import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, ActivityIndicator, type DimensionValue } from 'react-native';
import { COLORS } from '../constants/theme';
import { calculateDistanceKm, formatDistance, getWorkshopCoordinates, type Coordinates, type UserLocationDetails } from '../utils/location';
import { getWorkshopOpenStatus } from '../utils/operatingHours';
import { canBookWorkshop } from '../services/workshopService';
import type { Workshop } from '../types/database';
import { Crosshair, MapPin } from 'lucide-react-native';

interface InteractiveWorkshopMapProps {
  userLocation: UserLocationDetails | Coordinates | null;
  workshops: Workshop[];
  selectedWorkshopId?: string | null;
  onSelectWorkshop?: (workshop: Workshop) => void;
  onBookWorkshop?: (workshop: Workshop) => void;
  onRefreshLocation?: () => void;
  locationLoading?: boolean;
  height?: DimensionValue;
  showHud?: boolean;
}

export function InteractiveWorkshopMap({
  userLocation,
  workshops,
  selectedWorkshopId,
  onSelectWorkshop,
  onBookWorkshop,
  onRefreshLocation,
  locationLoading,
  height = 480,
  showHud = true,
}: InteractiveWorkshopMapProps) {
  const iframeRef = useRef<any>(null);

  // Prepare workshops data payload with coordinates and distances
  const workshopsData = useMemo(() => {
    const refLat = userLocation?.latitude ?? 5.3644;
    const refLng = userLocation?.longitude ?? 100.5618;

    return workshops
      .map((w) => {
        const coords = getWorkshopCoordinates(w);
        if (!coords) return null;

        const distKm = calculateDistanceKm(refLat, refLng, coords.latitude, coords.longitude);
        const openStatus = getWorkshopOpenStatus(w);
        const bookable = canBookWorkshop(w);

        return {
          id: w.id,
          name: w.name,
          address: w.address || 'Kulim, Kedah',
          phone: w.phone || '',
          rating: w.rating ? Number(w.rating).toFixed(1) : '4.8',
          reviewCount: w.review_count || 18,
          lat: coords.latitude,
          lng: coords.longitude,
          distanceKm: distKm,
          distanceText: formatDistance(distKm),
          isOpen: openStatus.isOpen,
          statusLabel: openStatus.statusText,
          isPartner: Boolean(w.is_partner || bookable),
          bookingEnabled: bookable,
        };
      })
      .filter(Boolean);
  }, [workshops, userLocation]);

  // Listen to postMessage from iframe
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || !data.type) return;

        if (data.type === 'SELECT_WORKSHOP' && data.workshopId) {
          const found = workshops.find((w) => w.id === data.workshopId);
          if (found && onSelectWorkshop) {
            onSelectWorkshop(found);
          }
        } else if (data.type === 'BOOK_WORKSHOP' && data.workshopId) {
          const found = workshops.find((w) => w.id === data.workshopId);
          if (found && onBookWorkshop) {
            onBookWorkshop(found);
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [workshops, onSelectWorkshop, onBookWorkshop]);

  // Generate Leaflet Dark-Mode HTML template
  const mapHtml = useMemo(() => {
    const userLat = userLocation?.latitude ?? 5.3644;
    const userLng = userLocation?.longitude ?? 100.5618;
    const accuracy = (userLocation as UserLocationDetails)?.accuracy ?? 25;
    const hasUserGPS = Boolean(userLocation);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>RiderHood Live GPS Workshop Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #0A0C10; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    
    /* Dark Tile Filter for OpenStreetMap */
    .leaflet-tile {
      filter: invert(100%) hue-rotate(180deg) brightness(88%) contrast(105%);
    }

    /* Custom Leaflet Controls Positioned on Top Right */
    .leaflet-top.leaflet-right {
      margin-top: 48px !important;
      margin-right: 10px !important;
    }
    .leaflet-bar { border: none !important; box-shadow: 0 4px 14px rgba(0,0,0,0.6) !important; border-radius: 8px !important; overflow: hidden !important; }
    .leaflet-bar a {
      background-color: #151922 !important;
      color: #FF6B00 !important;
      border: 1px solid #28303F !important;
      border-bottom: 1px solid #1E2530 !important;
      width: 32px !important;
      height: 32px !important;
      line-height: 32px !important;
      font-size: 16px !important;
      font-weight: 900 !important;
    }
    .leaflet-bar a:hover { background-color: #1E2530 !important; color: #FFAA4D !important; }

    /* Radar Pulsing Beacon for User Location */
    .user-beacon-wrapper {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-beacon-pulse {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 217, 255, 0.25);
      border: 2px solid #00D9FF;
      animation: beacon-pulse 2s infinite ease-out;
    }
    .user-beacon-center {
      position: relative;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #00D9FF;
      border: 3px solid #FFFFFF;
      box-shadow: 0 0 12px #00D9FF, 0 2px 6px rgba(0,0,0,0.8);
      z-index: 10;
    }
    @keyframes beacon-pulse {
      0% { transform: scale(0.4); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* Workshop Marker Pins */
    .ws-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      padding: 5px 9px;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.7);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ws-pin:hover { transform: scale(1.12); z-index: 9999 !important; }
    .ws-pin-partner {
      background: linear-gradient(135deg, #FF6B00 0%, #FF8533 100%);
      color: #000000;
      border: 2px solid #FFFFFF;
      box-shadow: 0 0 16px rgba(255, 107, 0, 0.6);
    }
    .ws-pin-standard {
      background: #151922;
      color: #FFFFFF;
      border: 1.5px solid #FF6B00;
    }

    /* Leaflet Popups */
    .leaflet-popup-content-wrapper {
      background: #151922 !important;
      color: #FFFFFF !important;
      border-radius: 14px !important;
      border: 1px solid #28303F !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.8) !important;
      padding: 2px !important;
    }
    .leaflet-popup-tip { background: #151922 !important; border: 1px solid #28303F !important; }
    .leaflet-popup-close-button { color: #A1A1AA !important; padding: 6px !important; }
    .leaflet-popup-close-button:hover { color: #FF6B00 !important; }

    /* Popup Card Styles */
    .popup-card { padding: 8px 10px; width: 220px; font-family: sans-serif; }
    .popup-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .popup-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .popup-badge-partner { background: rgba(255, 107, 0, 0.2); color: #FF6B00; border: 1px solid rgba(255, 107, 0, 0.4); }
    .popup-badge-standard { background: rgba(255, 255, 255, 0.08); color: #A1A1AA; }
    .popup-dist { font-size: 11px; font-weight: 700; color: #00D9FF; }
    .popup-title { font-size: 13px; font-weight: 800; color: #FFFFFF; line-height: 16px; margin: 4px 0 2px 0; }
    .popup-meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #A1A1AA; margin-bottom: 6px; }
    .popup-star { color: #F59E0B; font-weight: 800; }
    .popup-open { color: #10B981; font-weight: 700; }
    .popup-closed { color: #EF4444; font-weight: 700; }
    .popup-address { font-size: 10px; color: #71717A; line-height: 13px; margin-bottom: 8px; }

    /* Action Buttons in Popup */
    .popup-actions { display: flex; gap: 6px; }
    .popup-btn {
      flex: 1;
      padding: 7px 0;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      text-align: center;
      cursor: pointer;
      text-decoration: none;
      border: none;
      display: inline-block;
      transition: opacity 0.2s;
    }
    .popup-btn:hover { opacity: 0.9; }
    .popup-btn-book { background: #FF6B00; color: #000000; }
    .popup-btn-dir { background: #242B38; color: #FFFFFF; border: 1px solid #323A4A; }
    
    /* Top Floating GPS HUD */
    .map-hud {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
    }
    .map-badge {
      pointer-events: auto;
      background: rgba(16, 19, 24, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 107, 0, 0.3);
      padding: 6px 12px;
      border-radius: 10px;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .map-hud-right {
      display: flex;
      gap: 6px;
      pointer-events: auto;
    }
    .hud-btn {
      background: rgba(16, 19, 24, 0.9);
      border: 1px solid #28303F;
      color: #FF6B00;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: background 0.2s;
    }
    .hud-btn:hover { background: #1E2530; color: #FFAA4D; }
  </style>
</head>
<body>
  <div id="map"></div>

  <div class="map-hud">
    <div class="map-badge">
      <span style="color: #00D9FF;">📍</span>
      <span>${hasUserGPS ? 'Live GPS (' + userLat.toFixed(4) + '°, ' + userLng.toFixed(4) + '°)' : 'Kulim Center (5.3644°, 100.5618°)'}</span>
    </div>
    <div class="map-hud-right">
      <button class="hud-btn" onclick="recenterMap()">🎯 Focus Me</button>
      <button class="hud-btn" onclick="fitAllWorkshops()">🗺️ Fit All</button>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const userLat = ${userLat};
    const userLng = ${userLng};
    const accuracy = ${accuracy};
    const hasGPS = ${hasUserGPS};
    const workshops = ${JSON.stringify(workshopsData)};

    // Initialize Map with dark tiles
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([userLat, userLng], 14);

    // Zoom control on top right (no overlap with bottom HUD)
    L.control.zoom({ position: 'topright' }).addTo(map);

    // OpenStreetMap tile layer with dark CSS filter
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    // 1. User Live GPS Location Marker & Accuracy Circle
    if (hasGPS) {
      const beaconIcon = L.divIcon({
        className: 'user-beacon-div',
        html: '<div class="user-beacon-wrapper"><div class="user-beacon-pulse"></div><div class="user-beacon-center"></div></div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const userMarker = L.marker([userLat, userLng], { icon: beaconIcon, zIndexOffset: 1000 }).addTo(map);
      userMarker.bindPopup('<div style="padding: 4px; font-weight: 800; color: #00D9FF; text-align: center;">📍 YOU ARE HERE<br><span style="font-size: 10px; color: #A1A1AA; font-weight: normal;">Live Device Location</span></div>');

      // Accuracy circle
      L.circle([userLat, userLng], {
        radius: Math.max(accuracy, 30),
        color: '#00D9FF',
        fillColor: '#00D9FF',
        fillOpacity: 0.08,
        weight: 1,
        dashArray: '4, 4',
      }).addTo(map);
    }

    // 2. Add Workshop Markers
    const markers = [];
    workshops.forEach((ws) => {
      const isPartner = ws.isPartner;
      const pinClass = isPartner ? 'ws-pin ws-pin-partner' : 'ws-pin ws-pin-standard';
      const label = isPartner ? '⚡ ' + ws.name : '🔧 ' + ws.name;

      const icon = L.divIcon({
        className: 'custom-ws-icon',
        html: '<div class="' + pinClass + '" title="' + ws.name + '">' + label + '</div>',
        iconSize: [120, 28],
        iconAnchor: [60, 14],
      });

      const marker = L.marker([ws.lat, ws.lng], { icon }).addTo(map);
      markers.push(marker);

      // Popup content
      const googleMapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + ws.lat + ',' + ws.lng;
      const statusHtml = ws.isOpen
        ? '<span class="popup-open">🟢 Buka Sekarang</span>'
        : '<span class="popup-closed">🔴 Tutup</span>';

      const partnerBadgeHtml = ws.isPartner
        ? '<span class="popup-badge popup-badge-partner">⚡ Official Partner</span>'
        : '<span class="popup-badge popup-badge-standard">Directory</span>';

      const bookBtnHtml = ws.bookingEnabled
        ? '<button class="popup-btn popup-btn-book" onclick="bookWorkshop(\\'' + ws.id + '\\')">Tempah Servis</button>'
        : '<a class="popup-btn popup-btn-book" style="background:#242B38;color:#FF6B00;border:1px solid #FF6B00;" href="tel:' + ws.phone.replace(/\\s+/g, '') + '">Hubungi</a>';

      const popupContent = '<div class="popup-card">' +
        '<div class="popup-header">' +
          partnerBadgeHtml +
          '<span class="popup-dist">' + ws.distanceText + '</span>' +
        '</div>' +
        '<div class="popup-title">' + ws.name + '</div>' +
        '<div class="popup-meta">' +
          '<span class="popup-star">★ ' + ws.rating + '</span>' +
          '<span>•</span>' +
          statusHtml +
        '</div>' +
        '<div class="popup-address">' + ws.address + '</div>' +
        '<div class="popup-actions">' +
          bookBtnHtml +
          '<a class="popup-btn popup-btn-dir" href="' + googleMapsUrl + '" target="_blank">Arah Jalan</a>' +
        '</div>' +
      '</div>';

      marker.bindPopup(popupContent);
    });

    // Control Handlers
    window.recenterMap = function() {
      map.flyTo([userLat, userLng], 15, { duration: 1.2 });
    };

    window.fitAllWorkshops = function() {
      if (markers.length > 0) {
        const group = L.featureGroup([
          ...markers,
          ...(hasGPS ? [L.marker([userLat, userLng])] : [])
        ]);
        map.fitBounds(group.getBounds().pad(0.15), { duration: 1 });
      }
    };

    window.bookWorkshop = function(wsId) {
      window.parent.postMessage({ type: 'BOOK_WORKSHOP', workshopId: wsId }, '*');
    };

    window.selectWorkshop = function(wsId) {
      window.parent.postMessage({ type: 'SELECT_WORKSHOP', workshopId: wsId }, '*');
    };
  </script>
</body>
</html>
    `;
  }, [userLocation, workshopsData]);

  return (
    <View style={[styles.mapContainer, { height }]}>
      {Platform.OS === 'web' ? (
        <iframe
          ref={iframeRef}
          srcDoc={mapHtml}
          title="Interactive Workshop Map"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 18,
            backgroundColor: COLORS.surfaceContainer,
          }}
        />
      ) : (
        <View style={styles.nativeFallback}>
          <MapPin color={COLORS.primary} size={36} />
          <Text style={styles.nativeFallbackTitle}>Live GPS Workshop Map</Text>
          <Text style={styles.nativeFallbackSubtitle}>
            {userLocation
              ? `📍 Precise Location: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`
              : 'Detecting live GPS coordinates...'}
          </Text>
        </View>
      )}

      {/* Floating GPS HUD Info Card */}
      {showHud && (
        <View style={styles.hudOverlay}>
          <View style={styles.hudLeft}>
            <View style={[styles.gpsIndicatorDot, { backgroundColor: userLocation ? '#00D9FF' : COLORS.warning }]} />
            <View>
              <Text style={styles.hudTitle}>
                {userLocation ? 'GPS Precise Lock' : 'GPS Locating...'}
              </Text>
              <Text style={styles.hudCoords}>
                {userLocation
                  ? `${userLocation.latitude.toFixed(5)}° N, ${userLocation.longitude.toFixed(5)}° E (±${Math.round((userLocation as UserLocationDetails)?.accuracy || 15)}m)`
                  : 'Acquiring high accuracy GPS fix...'}
              </Text>
            </View>
          </View>

          {onRefreshLocation && (
            <TouchableOpacity
              style={styles.refreshLocBtn}
              onPress={onRefreshLocation}
              disabled={locationLoading}
              activeOpacity={0.8}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Crosshair color="#000" size={13} />
                  <Text style={styles.refreshLocText}>Locate</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceContainer,
    position: 'relative',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  nativeFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  nativeFallbackTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  nativeFallbackSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  hudOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(16, 19, 24, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  gpsIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  hudTitle: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudCoords: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  refreshLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshLocText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
});
