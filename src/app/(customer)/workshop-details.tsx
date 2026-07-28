import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { CustomButton } from '../../components/CustomButton';
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Wrench,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react-native';
import { getWorkshop, getWorkshopServices } from '../../services/workshopService';
import type { Service, Workshop } from '../../types/database';

export default function WorkshopDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workshopId = (params.id as string) || '';

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const name = (params.name as string) || workshop?.name || 'Motorcycle Workshop';
  const address = (params.address as string) || workshop?.address || 'Kuala Lumpur';
  const phone = (params.phone as string) || workshop?.phone || 'N/A';
  const rating = parseFloat((params.rating as string) || (workshop?.rating ?? 4.9).toString());
  const isOpen = params.isOpen !== 'false' && (workshop ? workshop.is_open : true);

  useEffect(() => {
    const loadDetails = async () => {
      if (!workshopId) {
        setLoading(false);
        return;
      }
      try {
        const [wsData, svcData] = await Promise.all([
          getWorkshop(workshopId),
          getWorkshopServices(workshopId),
        ]);
        if (wsData) setWorkshop(wsData);
        setServices(svcData ?? []);
      } catch (err) {
        console.log('Error loading workshop details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [workshopId]);

  const handleBookNow = (serviceName?: string) => {
    router.push({
      pathname: '/(customer)/booking',
      params: {
        workshopId: workshopId || 'default',
        workshopName: name,
        serviceName,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeaderNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={COLORS.textPrimary} size={20} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner / Workshop Image Header */}
        <View style={styles.photoContainer}>
          <View style={styles.photoPlaceholder}>
            <Wrench color={COLORS.primary} size={48} />
            <Text style={styles.photoPlaceholderText}>RiderHood Certified Workshop</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
            <Text style={[styles.statusText, { color: isOpen ? COLORS.success : COLORS.danger }]}>
              {isOpen ? 'OPEN NOW' : 'CLOSED'}
            </Text>
          </View>
        </View>

        {/* Workshop Details Card */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.workshopName}>{name}</Text>
            <View style={styles.ratingBadge}>
              <Star color="#f59e0b" size={16} fill="#f59e0b" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MapPin color={COLORS.primary} size={16} />
            <Text style={styles.detailText}>Address: {address}</Text>
          </View>

          <View style={styles.detailRow}>
            <Phone color={COLORS.primary} size={16} />
            <Text style={styles.detailText}>Phone: {phone}</Text>
          </View>

          <View style={styles.detailRow}>
            <Clock color={COLORS.primary} size={16} />
            <Text style={styles.detailText}>Hours: 10:00 AM – 7:00 PM</Text>
          </View>
        </View>

        {/* Services List */}
        <Text style={styles.sectionHeader}>SERVICES & PRICING</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 20 }} />
        ) : services.length === 0 ? (
          <View style={styles.emptyServiceBox}>
            <Text style={styles.emptyServiceText}>Please proceed to booking to select your required services.</Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {services.map((serv) => (
              <View key={serv.id} style={styles.serviceItem}>
                <View style={{ flex: 1 }}>
                  <View style={styles.servNameRow}>
                    <CheckCircle2 color={COLORS.primary} size={16} />
                    <Text style={styles.serviceName}>{serv.name}</Text>
                  </View>
                  {serv.description ? (
                    <Text style={styles.serviceDesc}>{serv.description}</Text>
                  ) : null}
                </View>
                <View style={styles.priceActionCol}>
                  <Text style={styles.servicePrice}>RM{Number(serv.price).toFixed(0)}</Text>
                  <TouchableOpacity style={styles.selectServBtn} onPress={() => handleBookNow(serv.name)}>
                    <Text style={styles.selectServBtnText}>Select</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Bottom Booking Button */}
        <CustomButton
          title="BOOK SERVICE AT THIS WORKSHOP"
          onPress={() => handleBookNow()}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topHeaderNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  photoContainer: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    gap: 8,
  },
  photoPlaceholderText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workshopName: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sectionHeader: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyServiceBox: {
    backgroundColor: COLORS.surfaceContainer,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  emptyServiceText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  servicesList: {
    gap: 10,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  servNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  serviceName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  serviceDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  priceActionCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  servicePrice: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  selectServBtn: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  selectServBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
});
