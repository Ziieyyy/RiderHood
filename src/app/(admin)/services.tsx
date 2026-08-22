import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/theme';
import { Settings, Wrench, MapPin } from 'lucide-react-native';
import { getAllServices } from '../../services/adminService';
import { useTranslation } from '../../i18n';

export default function AdminServicesScreen() {
  const { t } = useTranslation();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadServices = async () => {
    try {
      const data = await getAllServices();
      setServices(data);
    } catch (err) {
      console.log('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  // Group services by workshop name
  const workshopMap = new Map<string, any[]>();
  services.forEach(s => {
    const wsName = s.workshop?.name || 'Unassigned';
    if (!workshopMap.has(wsName)) workshopMap.set(wsName, []);
    workshopMap.get(wsName)!.push(s);
  });
  const sortedWorkshops = Array.from(workshopMap.keys()).sort();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : services.length === 0 ? (
          <View style={styles.emptyState}>
            <Settings color={COLORS.textMuted} size={40} />
            <Text style={styles.emptyTitle}>{t('empty.noServices')}</Text>
            <Text style={styles.emptyDesc}>{t('empty.noServicesSub')}</Text>
          </View>
        ) : (
          sortedWorkshops.map(workshopName => (
            <View key={workshopName} style={styles.workshopGroup}>
              <View style={styles.workshopHeader}>
                <MapPin color={COLORS.primary} size={16} />
                <Text style={styles.workshopTitle}>{workshopName}</Text>
                <Text style={styles.serviceCount}>{workshopMap.get(workshopName)!.length}</Text>
              </View>
              
              <View style={styles.grid}>
                {workshopMap.get(workshopName)!.map((srv) => (
                  <View key={srv.id} style={styles.card}>
                    <View style={styles.iconBox}>
                      <Wrench color={COLORS.primary} size={24} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>{srv.name}</Text>
                    <Text style={styles.cardPrice}>RM {Number(srv.price || 0).toFixed(0)}</Text>
                    {srv.estimated_duration_minutes && (
                      <Text style={styles.cardDuration}>~{srv.estimated_duration_minutes} min</Text>
                    )}
                    <View style={[styles.availBadge, !srv.is_available && styles.unavailBadge]}>
                      <Text style={[styles.availText, !srv.is_available && styles.unavailText]}>
                        {srv.is_available ? t('common.available').toUpperCase() : t('common.unavailable').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  workshopGroup: {
    marginBottom: 24,
  },
  workshopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  workshopTitle: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  serviceCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardPrice: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardDuration: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 8,
  },
  availBadge: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  unavailBadge: {
    backgroundColor: COLORS.dangerBg,
  },
  availText: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: '800',
  },
  unavailText: {
    color: COLORS.danger,
  },
});
