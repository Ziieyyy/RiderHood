export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface UserLocationDetails extends Coordinates {
  accuracy?: number; // accuracy radius in meters
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

export const WORKSHOP_COORDINATES: Record<string, Coordinates> = {
  // 1. Wan Legacy Motor (Ground Floor No. 55, Lorong Kota Kenari 1/1, 09000 Kulim, Kedah)
  'b0000000-0000-0000-0000-000000000001': { latitude: 5.3712, longitude: 100.5543 },

  // 2. LHMotor @ Kelang Lama (65-68 Taman Manggis III, Jalan Kelang Lama, 09000 Kulim, Kedah)
  'b0000000-0000-0000-0000-000000000002': { latitude: 5.3821, longitude: 100.5489 },

  // 3. HK MOTOR KULIM, KEDAH (No. 254, Jalan Tunku Putra, Taman Tunku Putra, 09000 Kulim, Kedah)
  'b0000000-0000-0000-0000-000000000003': { latitude: 5.3654, longitude: 100.5591 },

  // 4. Eu Li Motor Sdn Bhd (76 A, Lorong Kemuning 1, Taman Kemuning, 09000 Kulim, Kedah)
  'b0000000-0000-0000-0000-000000000004': { latitude: 5.3582, longitude: 100.5672 },

  // 5. Hai Motorcycle Enterprise (588, Jalan Kemuning 1, Taman Kemuning, 09000 Kulim, Kedah)
  'b0000000-0000-0000-0000-000000000005': { latitude: 5.359, longitude: 100.568 },

  // 6. Castrol Bike Point – Motor shop Yew Ngee (2 & 3, Jalan Kelang Lama, Taman Manggis, 09000 Kulim, Kedah)
  'b0000000-0000-0000-0000-000000000006': { latitude: 5.3835, longitude: 100.5475 },

  // 7. Castrol Bike Point – CSL Brothers – Soon Soon Lee (5, Jalan Pandan Indah 1, Taman Pandan Indah, 09000 Kulim, Kedah)
  'b0000000-0000-0000-0000-000000000007': { latitude: 5.376, longitude: 100.5412 },

  // 8. Pit Stop Garage Motorsport (34, Jalan Kemunting 1, Taman Kemunting, 09000 Kulim, Kedah)
  'b0000000-0000-0000-0000-000000000008': { latitude: 5.361, longitude: 100.562 },

  // 9. Lian Motor / Lian Auto Parts Trading (691, Tingkat Bawah, Lorong Kemuning, Taman Keranji 2, 09000 Kulim, Kedah)
  'b0000000-0000-0000-0000-000000000009': { latitude: 5.3575, longitude: 100.5695 },

  // 10. CKT MOTOR KULIM (195-197, Tingkat Bawah, Jalan Lunas, Taman Seluang, 09000 Kulim, Kedah)
  'b0000000-0000-0000-0000-000000000010': { latitude: 5.3789, longitude: 100.5365 },

  // 11. Chong Hun Motor Kulim Enterprise (186K & 186L, Jalan Simpang Tiga Keladi, Keladi, 09000 Kulim, Kedah)
  'b0000000-0000-0000-0000-000000000011': { latitude: 5.3698, longitude: 100.5732 },
};

/**
 * Request real device / browser GPS location with high accuracy.
 */
export async function requestUserLocation(options?: { highAccuracy?: boolean; maxAge?: number }): Promise<UserLocationDetails | null> {
  return new Promise((resolve) => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          });
        },
        (err) => {
          console.warn('Geolocation prompt/fetch error:', err.message);
          resolve(null);
        },
        {
          enableHighAccuracy: options?.highAccuracy ?? true,
          timeout: 10000,
          maximumAge: options?.maxAge ?? 0,
        }
      );
    } else {
      resolve(null);
    }
  });
}

/**
 * Get coordinates for a workshop, falling back to known geolocations in Kulim.
 */
export function getWorkshopCoordinates(workshop?: { id?: string; latitude?: number | null; longitude?: number | null; name?: string } | null): Coordinates | null {
  if (!workshop) return null;

  if (workshop.latitude && workshop.longitude && Number(workshop.latitude) !== 0) {
    return {
      latitude: Number(workshop.latitude),
      longitude: Number(workshop.longitude),
    };
  }

  if (workshop.id && WORKSHOP_COORDINATES[workshop.id]) {
    return WORKSHOP_COORDINATES[workshop.id];
  }

  const name = (workshop.name || '').toLowerCase();
  if (name.includes('wan legacy')) return WORKSHOP_COORDINATES['b0000000-0000-0000-0000-000000000001'];
  if (name.includes('ckt motor')) return WORKSHOP_COORDINATES['b0000000-0000-0000-0000-000000000010'];
  if (name.includes('lhmotor')) return WORKSHOP_COORDINATES['b0000000-0000-0000-0000-000000000002'];
  if (name.includes('hk motor')) return WORKSHOP_COORDINATES['b0000000-0000-0000-0000-000000000003'];
  if (name.includes('eu li')) return WORKSHOP_COORDINATES['b0000000-0000-0000-0000-000000000004'];
  if (name.includes('hai motor')) return WORKSHOP_COORDINATES['b0000000-0000-0000-0000-000000000005'];
  if (name.includes('yew ngee')) return WORKSHOP_COORDINATES['b0000000-0000-0000-0000-000000000006'];
  if (name.includes('csl') || name.includes('soon soon lee')) return WORKSHOP_COORDINATES['b0000000-0000-0000-0000-000000000007'];
  if (name.includes('pit stop')) return WORKSHOP_COORDINATES['b0000000-0000-0000-0000-000000000008'];
  if (name.includes('lian motor') || name.includes('lian auto')) return WORKSHOP_COORDINATES['b0000000-0000-0000-0000-000000000009'];
  if (name.includes('chong hun')) return WORKSHOP_COORDINATES['b0000000-0000-0000-0000-000000000011'];

  return null;
}

/**
 * Calculates distance in Kilometers using the Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Pretty formats distance (e.g. "850 m", "2.3 km").
 */
export function formatDistance(distanceKm: number): string {
  if (isNaN(distanceKm) || distanceKm < 0) return '';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
