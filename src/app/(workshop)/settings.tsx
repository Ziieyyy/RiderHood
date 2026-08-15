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
import { COLORS } from '../../constants/theme';
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
import { useAuth } from '../../context/AuthContext';
import { getMyWorkshop, updateWorkshopStatus } from '../../services/workshopService';
import { supabase } from '../../lib/supabase';
import type { Workshop } from '../../types/database';

export default function WorkshopSettingsScreen() {
  const { profile, logout } = useAuth();
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
      Alert.alert('Error', 'Failed to load workshop details.');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

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
      Alert.alert('Status Updated', `Workshop is now marked as ${nextStatus ? 'OPEN' : 'CLOSED'}.`);
    } catch (err: any) {
      setIsOpen(!nextStatus);
      Alert.alert('Error', err?.message || 'Failed to update workshop status.');
    }
  };

  const handleSaveProfile = async () => {
    if (!workshop?.id) return;
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Workshop name cannot be empty.');
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
      Alert.alert('Saved Successfully', 'Your workshop profile and operating information have been updated.');
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Failed to update workshop information.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Workshop Preferences...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <WorkshopAdminHeader
        title="Workshop Settings"
        subtitle="Manage Operating Info, Hours & System Preferences"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Real-time Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
            <View style={[styles.statusDot, { backgroundColor: isOpen ? COLORS.success : COLORS.danger }]} />
            <View>
              <Text style={styles.statusTitle}>WORKSHOP STATUS</Text>
              <Text style={styles.statusSub}>
                {isOpen ? 'Accepting Customer Bookings' : 'Closed for Operations'}
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
        <Text style={styles.sectionTitle}>WORKSHOP PROFILE & OPERATING DETAILS</Text>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>WORKSHOP NAME *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. RiderHood Garage Cyberjaya"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>FULL ADDRESS</Text>
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
            <Text style={styles.inputLabel}>CONTACT PHONE</Text>
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
            <Text style={styles.inputLabel}>CONTACT EMAIL</Text>
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
            <Text style={styles.inputLabel}>OPERATING HOURS</Text>
            <TextInput
              style={styles.input}
              value={operatingHours}
              onChangeText={setOperatingHours}
              placeholder="e.g. Mon - Sat: 09:00 - 19:00"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <CustomButton
            title={saving ? 'SAVING CHANGES...' : 'SAVE WORKSHOP PROFILE'}
            onPress={handleSaveProfile}
            disabled={saving}
            style={{ marginTop: 6 }}
          />
        </View>

        {/* Notifications & Automation */}
        <Text style={styles.sectionTitle}>WORKSHOP NOTIFICATIONS & AUTOMATION</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Bell color={COLORS.primary} size={20} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Instant Booking SMS & Push Alerts</Text>
              <Text style={styles.rowSub}>Notify mechanics when a new customer booking arrives</Text>
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
              <Text style={styles.rowTitle}>Auto-Confirm Booking Requests</Text>
              <Text style={styles.rowSub}>Automatically confirm bookings when service bay capacity is open</Text>
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
          <Text style={styles.logoutBtnText}>Logout Workshop Admin Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.cards, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusTitle: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  statusSub: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 2 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  card: { backgroundColor: COLORS.cards, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 14 },
  inputGroup: { gap: 6 },
  inputLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  input: { backgroundColor: COLORS.secondaryBackground, borderRadius: 12, paddingHorizontal: 14, height: 44, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
  rowTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  rowSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.dangerBg, borderRadius: 14, paddingVertical: 14, marginTop: 8, borderWidth: 1, borderColor: COLORS.danger },
  logoutBtnText: { color: COLORS.danger, fontSize: 13, fontWeight: '800' },
});
