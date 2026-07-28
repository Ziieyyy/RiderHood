import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../constants/theme';
import { ChevronLeft, Save, MapPin, Phone, User, Clock } from 'lucide-react-native';
import { getWorkshop, updateWorkshop, setWorkshopStatus } from '../../../services/workshopService';
import type { Workshop } from '../../../types/database';

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    description: '',
    district: '',
    state: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await getWorkshop(id as string);
        if (data) {
          setWorkshop(data);
          setFormData({
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            description: data.description || '',
            district: data.district || '',
            state: data.state || '',
          });
        }
      } catch (err) {
        console.log('Error loading workshop:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!workshop?.id) return;
    setSaving(true);
    try {
      await updateWorkshop(workshop.id, {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        description: formData.description,
        district: formData.district,
        state: formData.state,
      });
      Alert.alert('Saved', 'Workshop details updated successfully.');
    } catch (err: any) {
      console.log('Save error:', err);
      Alert.alert('Error', 'Failed to save workshop details.');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    if (!workshop?.id) return;
    Alert.alert('Suspend Workshop', 'This will prevent the workshop from receiving bookings.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Suspend', style: 'destructive', onPress: async () => {
          try {
            await setWorkshopStatus(workshop.id, 'suspended');
            Alert.alert('Done', 'Workshop has been suspended.');
            router.back();
          } catch (err: any) {
            Alert.alert('Error', 'Failed to suspend workshop.');
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft color={COLORS.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Workshop</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Save color={COLORS.primary} size={20} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Workshop Name</Text>
          <View style={styles.inputBox}>
            <TextInput 
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <View style={[styles.inputBox, { height: 80 }]}>
            <TextInput 
              style={[styles.input, { textAlignVertical: 'top', paddingTop: 12 }]}
              value={formData.description}
              onChangeText={(text) => updateField('description', text)}
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Address</Text>
          <View style={styles.inputBox}>
            <MapPin color={COLORS.textSecondary} size={18} />
            <TextInput 
              style={styles.input}
              value={formData.address}
              onChangeText={(text) => updateField('address', text)}
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>District</Text>
            <View style={styles.inputBox}>
              <TextInput 
                style={styles.input}
                value={formData.district}
                onChangeText={(text) => updateField('district', text)}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>State</Text>
            <View style={styles.inputBox}>
              <TextInput 
                style={styles.input}
                value={formData.state}
                onChangeText={(text) => updateField('state', text)}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputBox}>
            <Phone color={COLORS.textSecondary} size={18} />
            <TextInput 
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => updateField('phone', text)}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {workshop && (
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Verification: <Text style={{ color: workshop.verification_status === 'approved' ? COLORS.success : '#f59e0b' }}>{(workshop.verification_status || 'pending').toUpperCase()}</Text></Text>
            <Text style={styles.statusLabel}>Status: <Text style={{ color: workshop.status === 'active' ? COLORS.success : COLORS.danger }}>{(workshop.status || 'active').toUpperCase()}</Text></Text>
            <Text style={styles.statusLabel}>Rating: ⭐ {workshop.rating || '0.0'} ({workshop.review_count || 0} reviews)</Text>
          </View>
        )}

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>DANGER ZONE</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleSuspend}>
            <Text style={styles.deleteBtnText}>Suspend Workshop Account</Text>
          </TouchableOpacity>
        </View>
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceContainer,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  saveBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  statusInfo: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  dangerZone: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 24,
    gap: 12,
  },
  dangerTitle: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  deleteBtn: {
    backgroundColor: COLORS.dangerBg,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '800',
  },
});
