import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { Service } from '../../types/database';
import { Wrench, Plus, Edit2, Trash2, Clock, RefreshCw } from 'lucide-react-native';
import { CustomButton } from '../../components/CustomButton';
import { getWorkshopServices, createService, getMyWorkshop } from '../../services/workshopService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function WorkshopServicesScreen() {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');

  const loadServices = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const ws = await getMyWorkshop(profile.id);
      if (ws) {
        const data = await getWorkshopServices(ws.id);
        setServices(data);
      }
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadServices(); }, [loadServices]);

  const handleAddService = async () => {
    if (title.trim().length > 0 && profile?.id) {
      try {
        const ws = await getMyWorkshop(profile.id);
        if (!ws) throw new Error('No workshop found');
        const newSrv = await createService({
          workshop_id: ws.id,
          name: title.trim(),
          price: parseFloat(price) || 99,
          estimated_duration_minutes: parseInt(duration) || 60,
          description: description.trim() || 'Maintenance package',
        });
        setServices([newSrv, ...services]);
      } catch (err: unknown) {
        const error = err as { message?: string };
        Alert.alert('Error', error?.message || 'Failed to add service.');
      }
      setTitle('');
      setPrice('');
      setDuration('');
      setDescription('');
      setShowAddModal(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      setServices(services.filter(s => s.id !== id));
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert('Error', error?.message || 'Failed to delete service.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>SERVICE PACKAGES CATALOG</Text>
          <Text style={styles.headerSub}>Manage workshop offerings, prices & duration</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Plus color="#000" size={16} />
          <Text style={styles.addBtnText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      {services.map(srv => (
        <View key={srv.id} style={styles.serviceCard}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.srvTitle}>{srv.name}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Clock color="#f59e0b" size={12} />
                  <Text style={styles.metaText}>{srv.estimated_duration_minutes || 60} mins</Text>
                </View>
                <View style={styles.metaChip}>
                  <Wrench color={COLORS.primaryDim} size={12} />
                  <Text style={styles.metaText}>{srv.category || 'Maintenance'}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.srvPrice}>RM {Number(srv.price).toFixed(0)}</Text>
          </View>

          <Text style={styles.srvDesc}>{srv.description || 'Standard service package'}</Text>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Edit2 color={COLORS.textSecondary} size={14} />
              <Text style={styles.actionText}>Edit Pricing</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(srv.id)}>
              <Trash2 color={COLORS.danger} size={14} />
              <Text style={[styles.actionText, { color: COLORS.danger }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Add Service Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Service Package</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SERVICE TITLE</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. ECU Remap & Dyno Run"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PRICE (RM)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="e.g. 250"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ESTIMATED DURATION</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="e.g. 90 mins"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Details of maintenance items..."
                placeholderTextColor={COLORS.textMuted}
                multiline
              />
            </View>

            <CustomButton
              title="PUBLISH SERVICE PACKAGE"
              onPress={handleAddService}
              style={{ marginTop: 8 }}
            />
            <CustomButton
              title="CANCEL"
              variant="secondary"
              onPress={() => setShowAddModal(false)}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  serviceCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  srvTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  srvPrice: {
    color: '#f59e0b',
    fontSize: 22,
    fontWeight: '900',
  },
  srvDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deleteBtn: {
    borderColor: COLORS.dangerBg,
  },
  actionText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#f59e0b',
    gap: 12,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
  },
});
