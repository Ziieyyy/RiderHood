import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Switch,
  Image,
} from 'react-native';
import { COLORS, DARK_COLORS } from '../../constants/theme';
import { Building2, CheckCircle2, RefreshCw, Clock, MapPin, Phone, Mail, Image as ImageIcon } from 'lucide-react-native';
import { CustomButton } from '../../components/CustomButton';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { getMyWorkshop, updateWorkshop } from '../../services/workshopService';
import type { Workshop } from '../../types/database';
import { useTranslation } from '../../i18n';

interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[] = [
  { day: 'Monday', isOpen: true, openTime: '09:00 AM', closeTime: '07:00 PM' },
  { day: 'Tuesday', isOpen: true, openTime: '09:00 AM', closeTime: '07:00 PM' },
  { day: 'Wednesday', isOpen: true, openTime: '09:00 AM', closeTime: '07:00 PM' },
  { day: 'Thursday', isOpen: true, openTime: '09:00 AM', closeTime: '07:00 PM' },
  { day: 'Friday', isOpen: true, openTime: '09:00 AM', closeTime: '07:00 PM' },
  { day: 'Saturday', isOpen: true, openTime: '09:00 AM', closeTime: '05:00 PM' },
  { day: 'Sunday', isOpen: false, openTime: '09:00 AM', closeTime: '05:00 PM' },
];

export default function WorkshopProfileScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Form fields — populated from DB
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  // Structured Operating Hours
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(DEFAULT_WEEKLY_SCHEDULE);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (ws) {
        setWorkshop(ws);
        setName(ws.name || '');
        setAddress(ws.address || '');
        setPhone(ws.phone || '');
        setEmail(ws.email || '');
        setDistrict(ws.district || '');
        setDescription(ws.description || '');
        setCoverImageUrl(ws.cover_image_url || '');

        if (ws.operating_hours) {
          try {
            const parsed = typeof ws.operating_hours === 'string' ? JSON.parse(ws.operating_hours) : ws.operating_hours;
            if (Array.isArray(parsed)) {
              setWeeklySchedule(parsed);
            }
          } catch {
            // Keep default if string format
          }
        }
      }
    } catch {
      setError('Failed to load workshop profile.');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleDay = (index: number) => {
    const updated = [...weeklySchedule];
    updated[index].isOpen = !updated[index].isOpen;
    setWeeklySchedule(updated);
  };

  const handleUpdateTime = (index: number, field: 'openTime' | 'closeTime', val: string) => {
    const updated = [...weeklySchedule];
    updated[index][field] = val;
    setWeeklySchedule(updated);
  };

  const handleSave = async () => {
    if (!workshop?.id) return;
    setSaving(true);
    try {
      await updateWorkshop(workshop.id, {
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        district: district.trim() || undefined,
        description: description.trim() || undefined,
        cover_image_url: coverImageUrl.trim() || undefined,
        operating_hours: JSON.stringify(weeklySchedule),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save workshop profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error || !workshop) {
    return (
      <View style={styles.centered}>
        <RefreshCw color={COLORS.danger} size={40} />
        <Text style={styles.errorTitle}>{t('errors.genericTitle')}</Text>
        <Text style={styles.errorDesc}>{error || 'Workshop not found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={loadData} tintColor="#f59e0b" />}
    >
      <View style={styles.bannerCard}>
        <Building2 color="#f59e0b" size={32} />
        <Text style={styles.bannerTitle}>{name || 'Workshop'}</Text>
        <Text style={styles.bannerSub}>
          {workshop.verification_status === 'approved'
            ? 'RiderHood Certified Service Partner'
            : `Verification: ${workshop.verification_status}`}
        </Text>
      </View>

      {saved && (
        <View style={styles.savedAlert}>
          <CheckCircle2 color={COLORS.success} size={16} />
          <Text style={styles.savedText}>{t('workshopAdmin.workshopSaved')}</Text>
        </View>
      )}

      {/* General Info */}
      <Text style={styles.sectionTitle}>{`${t('workshopAdmin.workshopProfile').toUpperCase()} & ${t('settings.contactSupport').toUpperCase()}`}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('workshopAdmin.workshopName').toUpperCase()}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('workshop.description').toUpperCase()}</Text>
        <TextInput
          style={[styles.input, { height: 60 }]}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={t('workshop.description')}
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('workshopAdmin.workshopAddress').toUpperCase()}</Text>
        <TextInput style={[styles.input, { height: 50 }]} value={address} onChangeText={setAddress} multiline />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('workshopAdmin.districtCity').toUpperCase()}</Text>
        <TextInput style={styles.input} value={district} onChangeText={setDistrict} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('workshopAdmin.workshopPhone').toUpperCase()}</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('auth.email').toUpperCase()}</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>SHOP PHOTO / BANNER IMAGE URL</Text>
        <TextInput
          style={styles.input}
          value={coverImageUrl}
          onChangeText={setCoverImageUrl}
          autoCapitalize="none"
          placeholder="https://example.com/shop-photo.jpg"
          placeholderTextColor={COLORS.textMuted}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity
            style={styles.presetPhotoBtn}
            onPress={() => setCoverImageUrl('https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80')}
          >
            <ImageIcon color={COLORS.primary} size={14} />
            <Text style={styles.presetPhotoBtnText}>Use Official Shop Photo</Text>
          </TouchableOpacity>
        </View>
        {coverImageUrl ? (
          <View style={styles.coverPreviewBox}>
            <Image source={{ uri: coverImageUrl }} style={styles.coverPreviewImage} resizeMode="cover" />
          </View>
        ) : null}
      </View>

      {/* Weekly Operating Hours Schedule */}
      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t('workshopAdmin.operatingHours').toUpperCase()}</Text>

      <View style={styles.scheduleCard}>
        {weeklySchedule.map((item, idx) => (
          <View key={item.day} style={styles.dayRow}>
            <View style={styles.dayLeft}>
              <Switch
                value={item.isOpen}
                onValueChange={() => handleToggleDay(idx)}
                trackColor={{ false: COLORS.surface, true: '#f59e0b' }}
                thumbColor="#fff"
              />
              <Text style={[styles.dayName, !item.isOpen && { color: COLORS.textMuted }]}>{item.day}</Text>
            </View>

            {item.isOpen ? (
              <View style={styles.timeInputsRow}>
                <TextInput
                  style={styles.timeInput}
                  value={item.openTime}
                  onChangeText={(val) => handleUpdateTime(idx, 'openTime', val)}
                />
                <Text style={{ color: COLORS.textMuted }}>-</Text>
                <TextInput
                  style={styles.timeInput}
                  value={item.closeTime}
                  onChangeText={(val) => handleUpdateTime(idx, 'closeTime', val)}
                />
              </View>
            ) : (
              <Text style={styles.closedTag}>{t('common.closed').toUpperCase()}</Text>
            )}
          </View>
        ))}
      </View>

      <CustomButton
        title={saving ? t('common.saving').toUpperCase() : t('workshopAdmin.saveProfile').toUpperCase()}
        onPress={handleSave}
        disabled={saving}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
}

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: colors.background },
    loadingText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
    errorTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
    errorDesc: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
    retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    retryText: { color: isDark ? '#000000' : '#FFFFFF', fontWeight: '800', fontSize: 13 },
    scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
    bannerCard: { backgroundColor: colors.surfaceContainer, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#3b2f10' : colors.border, gap: 8 },
    bannerTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
    bannerSub: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    savedAlert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.successBg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.success },
    savedText: { color: colors.success, fontSize: 12, fontWeight: '700' },
    sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
    inputGroup: { gap: 6 },
    inputLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
    input: { backgroundColor: colors.surfaceContainer, borderRadius: 12, paddingHorizontal: 14, height: 46, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, fontSize: 14 },
    scheduleCard: { backgroundColor: colors.surfaceContainer, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
    dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dayName: { color: colors.textPrimary, fontSize: 13, fontWeight: '800', width: 80 },
    timeInputsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timeInput: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, color: colors.textPrimary, fontSize: 11, fontWeight: '700', borderWidth: 1, borderColor: colors.border, width: 75, textAlign: 'center' },
    closedTag: { color: colors.danger, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    presetPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceContainer, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
    presetPhotoBtnText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    coverPreviewBox: { marginTop: 8, height: 120, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    coverPreviewImage: { width: '100%', height: '100%' },
  });
