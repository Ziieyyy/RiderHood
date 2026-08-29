import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS, DARK_COLORS } from '../../constants/theme';
import {
  Bell,
  Shield,
  LogOut,
  Store,
  MapPin,
  Phone,
  Mail,
  Clock,
  Save,
  Power,
  RefreshCw,
  Sliders,
} from 'lucide-react-native';
import { WorkshopAdminHeader } from '../../components/WorkshopAdminHeader';
import { CustomButton } from '../../components/CustomButton';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';
import { getMyWorkshop, updateWorkshopStatus } from '../../services/workshopService';
import { supabase } from '../../lib/supabase';
import type { Workshop } from '../../types/database';

export default function WorkshopSettingsScreen() {
  const { profile, logout } = useAuth();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable Workshop Fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  // Preference switches
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  const loadWorkshopData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (ws) {
        setWorkshop(ws);
        setName(ws.name || '');
        setAddress(ws.address || '');
        setPhone(ws.phone || '');
        let hoursStr = 'Mon-Sat: 09:00 - 19:00';
        if (ws.operating_hours) {
          if (typeof ws.operating_hours === 'string') {
            try {
              const parsed = JSON.parse(ws.operating_hours);
              hoursStr = typeof parsed === 'string' ? parsed : ws.operating_hours;
            } catch {
              hoursStr = ws.operating_hours;
            }
          } else {
            hoursStr = JSON.stringify(ws.operating_hours);
          }
        }
        setOperatingHours(hoursStr);
        setIsOpen(ws.is_open ?? true);
      }
    } catch {
      Alert.alert(t('common.error'), t('errors.genericMessage'));
    } finally {
      setLoading(false);
    }
  }, [profile?.id, t]);

  useEffect(() => {
    loadWorkshopData();
  }, [loadWorkshopData]);

  const handleToggleOpenStatus = async () => {
    if (!workshop?.id) return;
    const nextStatus = !isOpen;
    setIsOpen(nextStatus);
    try {
      await updateWorkshopStatus(workshop.id, nextStatus);
      setWorkshop((prev) => (prev ? { ...prev, is_open: nextStatus } : prev));
      Alert.alert(t('common.status'), `${t('workshop.hours')}: ${nextStatus ? t('workshopAdmin.workshopOnline') : t('workshopAdmin.workshopOffline')}`);
    } catch (err: any) {
      setIsOpen(!nextStatus);
      Alert.alert(t('common.error'), err?.message || t('errors.genericMessage'));
    }
  };

  const handleSaveProfile = async () => {
    if (!workshop?.id) return;
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    setSaving(true);
    try {
      const rawHours = operatingHours.trim();
      const formattedHours = rawHours ? (rawHours.startsWith('{') || rawHours.startsWith('"') ? rawHours : JSON.stringify(rawHours)) : null;

      const { data, error } = await supabase
        .from('workshops')
        .update({
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          operating_hours: formattedHours,
          is_open: isOpen,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workshop.id)
        .select()
        .single();

      if (error) throw error;

      setWorkshop(data);
      Alert.alert(t('common.success'), t('settings.saveChanges'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('errors.genericMessage'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <WorkshopAdminHeader
        title={t('workshopAdmin.settings')}
        subtitle={t('settings.subtitle')}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Language Selection Card */}
        <LanguageSelector variant="card" />

        {/* Real-time Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
            <View style={[styles.statusDot, { backgroundColor: isOpen ? COLORS.success : COLORS.danger }]} />
            <View>
              <Text style={styles.statusTitle}>{`${t('dashboard.workshop').toUpperCase()} ${t('common.status').toUpperCase()}`}</Text>
              <Text style={styles.statusSub}>
                {isOpen ? t('workshopAdmin.workshopOnline') : t('workshopAdmin.workshopOffline')}
              </Text>
            </View>
          </View>
          <Switch
            value={isOpen}
            onValueChange={handleToggleOpenStatus}
            trackColor={{ false: COLORS.border, true: 'rgba(255, 107, 0, 0.5)' }}
            thumbColor={isOpen ? COLORS.primary : COLORS.textMuted}
          />
        </View>

        {/* Workshop Profile Form */}
        <Text style={styles.sectionTitle}>{t('workshopAdmin.workshopProfile').toUpperCase()}</Text>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('workshopAdmin.workshopName').toUpperCase()} *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. RiderHood Garage Cyberjaya"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('workshopAdmin.workshopAddress').toUpperCase()}</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top', paddingTop: 10 }]}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. No. 12, Jalan Cyber 4, Cyberjaya"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('workshopAdmin.workshopPhone').toUpperCase()}</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +6012-3456789"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.email').toUpperCase()}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. garage@riderhood.my"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('workshopAdmin.operatingHours').toUpperCase()}</Text>
            <TextInput
              style={styles.input}
              value={operatingHours}
              onChangeText={setOperatingHours}
              placeholder="e.g. Mon - Sat: 09:00 - 19:00"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <CustomButton
            title={saving ? t('common.saving').toUpperCase() : t('workshopAdmin.saveProfile').toUpperCase()}
            onPress={handleSaveProfile}
            disabled={saving}
            style={{ marginTop: 6 }}
          />
        </View>

        {/* Notifications & Automation */}
        <Text style={styles.sectionTitle}>{t('settings.notifications').toUpperCase()}</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Bell color={COLORS.primary} size={20} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t('settings.bookingUpdates')}</Text>
              <Text style={styles.rowSub}>{t('settings.bookingUpdatesDesc')}</Text>
            </View>
            <Switch
              value={smsAlerts}
              onValueChange={setSmsAlerts}
              trackColor={{ false: COLORS.border, true: 'rgba(255, 107, 0, 0.5)' }}
              thumbColor={smsAlerts ? COLORS.primary : COLORS.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Shield color={COLORS.primary} size={20} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t('settings.serviceReminders')}</Text>
              <Text style={styles.rowSub}>{t('settings.serviceRemindersDesc')}</Text>
            </View>
            <Switch
              value={autoAccept}
              onValueChange={setAutoAccept}
              trackColor={{ false: COLORS.border, true: 'rgba(255, 107, 0, 0.5)' }}
              thumbColor={autoAccept ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>

        {/* Admin Session Control */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <LogOut color={COLORS.danger} size={18} />
          <Text style={styles.logoutBtnText}>{`${t('common.logout')} (${t('workshopAdmin.title')})`}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: colors.background },
    loadingText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
    statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.cards, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    statusTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
    statusSub: { color: colors.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 2 },
    sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
    card: { backgroundColor: colors.cards, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 14 },
    inputGroup: { gap: 6 },
    inputLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    input: { backgroundColor: colors.secondaryBackground, borderRadius: 12, paddingHorizontal: 14, height: 44, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, fontSize: 13 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowText: { flex: 1 },
    rowTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    rowSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
    divider: { height: 1, backgroundColor: colors.border },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.dangerBg, borderRadius: 14, paddingVertical: 14, marginTop: 8, borderWidth: 1, borderColor: colors.danger },
    logoutBtnText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
  });
