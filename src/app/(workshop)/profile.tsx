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
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { Building2, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { CustomButton } from '../../components/CustomButton';
import { useAuth } from '../../context/AuthContext';
import { getMyWorkshop, updateWorkshop } from '../../services/workshopService';
import type { Workshop } from '../../types/database';

export default function WorkshopProfileScreen() {
  const { profile } = useAuth();
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
  const [hours, setHours] = useState('');
  const [district, setDistrict] = useState('');

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
        setHours(ws.operating_hours || '');
        setDistrict(ws.district || '');
      }
    } catch {
      setError('Failed to load workshop profile.');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!workshop?.id) return;
    setSaving(true);
    try {
      await updateWorkshop(workshop.id, {
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        operating_hours: hours.trim() || undefined,
        district: district.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert('Error', error?.message || 'Failed to save workshop profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading workshop profile...</Text>
      </View>
    );
  }

  if (error || !workshop) {
    return (
      <View style={styles.centered}>
        <RefreshCw color={COLORS.danger} size={40} />
        <Text style={styles.errorTitle}>Could not load profile</Text>
        <Text style={styles.errorDesc}>{error || 'Workshop not found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>Retry</Text>
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
          <Text style={styles.savedText}>Workshop details saved successfully!</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>WORKSHOP DETAILS</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>WORKSHOP NAME</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>PHYSICAL ADDRESS</Text>
        <TextInput style={[styles.input, { height: 60 }]} value={address} onChangeText={setAddress} multiline />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>DISTRICT / CITY</Text>
        <TextInput style={styles.input} value={district} onChangeText={setDistrict} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>OPERATING HOURS</Text>
        <TextInput style={styles.input} value={hours} onChangeText={setHours} placeholder="e.g. Mon-Sat: 9AM-7PM" placeholderTextColor={COLORS.textMuted} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>PHONE NUMBER</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>WORKSHOP EMAIL</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      </View>

      <CustomButton
        title={saving ? 'SAVING...' : 'SAVE WORKSHOP PROFILE'}
        onPress={handleSave}
        disabled={saving}
        style={{ marginTop: 8 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
  errorDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
  bannerCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#3b2f10', gap: 8 },
  bannerTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '900' },
  bannerSub: { color: '#f59e0b', fontSize: 12, fontWeight: '700' },
  savedAlert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.successBg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.success },
  savedText: { color: COLORS.success, fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  inputGroup: { gap: 6 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  input: { backgroundColor: COLORS.surfaceContainer, borderRadius: 12, paddingHorizontal: 14, height: 46, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, fontSize: 14 },
});
