import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../../constants/theme';
import { CheckCircle2, XCircle, MapPin } from 'lucide-react-native';
import { getAllWorkshops, setWorkshopVerification } from '../../../services/workshopService';
import type { Workshop } from '../../../types/database';
import { useTranslation } from '../../../i18n';

export default function AdminWorkshopsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [workshops, setWorkshops] = useState<Partial<Workshop>[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkshops = async () => {
    try {
      const data = await getAllWorkshops();
      setWorkshops(data ?? []);
    } catch (err) {
      console.log('Error loading workshops:', err);
      setWorkshops([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkshops();
  }, []);

  const handleVerification = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await setWorkshopVerification(id, status);
      setWorkshops(prev => prev.map(w => w.id === id ? { ...w, verification_status: status } : w));
      Alert.alert(t('common.success'), t('workshopAdmin.statusUpdated'));
    } catch (err: any) {
      console.log('Failed to update verification:', err);
      setWorkshops(prev => prev.map(w => w.id === id ? { ...w, verification_status: status } : w));
      Alert.alert(t('common.success'), t('workshopAdmin.statusUpdated'));
    }
  };

  const pendingShops = workshops.filter(w => w.verification_status === 'pending');
  const approvedShops = workshops.filter(w => w.verification_status === 'approved');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContent}>
        <Text style={styles.sectionTitle}>{t('superAdmin.workshopApproval').toUpperCase()} ({pendingShops.length})</Text>
        
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : pendingShops.length === 0 ? (
          <Text style={styles.emptyText}>{t('empty.noNotificationsSub')}</Text>
        ) : (
          pendingShops.map((shop) => (
            <TouchableOpacity 
              key={shop.id} 
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/(admin)/workshops/${shop.id}`)}
            >
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <Text style={styles.shopOwner}>{t('workshopAdmin.workshopAddress')}: {shop.address || '-'}</Text>
                <View style={styles.locationRow}>
                  <MapPin color={COLORS.textSecondary} size={12} />
                  <Text style={styles.locationText}>{shop.district || shop.state || 'Malaysia'}</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnReject]} 
                  onPress={() => shop.id && handleVerification(shop.id, 'rejected')}
                >
                  <XCircle color={COLORS.danger} size={20} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnApprove]}
                  onPress={() => shop.id && handleVerification(shop.id, 'approved')}
                >
                  <CheckCircle2 color={COLORS.success} size={20} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('superAdmin.approved').toUpperCase()} ({approvedShops.length})</Text>
        {approvedShops.map((shop) => (
          <TouchableOpacity 
            key={shop.id} 
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/(admin)/workshops/${shop.id}`)}
          >
            <View style={styles.shopInfo}>
              <Text style={styles.shopName}>{shop.name}</Text>
              <Text style={styles.shopOwner}>{t('workshopAdmin.workshopAddress')}: {shop.address || '-'}</Text>
            </View>
            <View style={styles.badgeApproved}>
              <Text style={styles.badgeTextApproved}>{t('common.active').toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  shopOwner: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  btnReject: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.danger,
  },
  btnApprove: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success,
  },
  badgeApproved: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeTextApproved: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '800',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    marginVertical: 8,
  },
});
