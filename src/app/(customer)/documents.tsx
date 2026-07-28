import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  FileText,
  Plus,
  Trash2,
  Eye,
  Download,
  Shield,
  FileCheck,
  Calendar,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import {
  getCustomerDocuments,
  createDocument,
  deleteDocument,
} from '../../services/documentService';
import type { Document as RiderDoc, DocumentType } from '../../types/database';

export default function DocumentsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<RiderDoc[]>([]);
  const [selectedType, setSelectedType] = useState<DocumentType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentType>('Insurance');
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDocs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getCustomerDocuments(user.id);
      setDocuments(data);
    } catch (err) {
      console.log('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleAddDocument = async () => {
    if (!user?.id || !docTitle.trim()) {
      Alert.alert('Required', 'Please enter a document title.');
      return;
    }
    setSubmitting(true);
    try {
      await createDocument({
        customer_id: user.id,
        title: docTitle.trim(),
        type: docCategory,
        file_path: 'documents/placeholder.pdf',
        expiry_date: expiryDate.trim() || undefined,
      });

      Alert.alert('Success', 'Document uploaded successfully to your vault.');
      setModalVisible(false);
      setDocTitle('');
      setExpiryDate('');
      fetchDocs();
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Failed to create document entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (docId: string, title: string) => {
    Alert.alert('Delete Document', `Are you sure you want to remove ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(docId);
            setDocuments(prev => prev.filter(d => d.id !== docId));
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete document.');
          }
        },
      },
    ]);
  };

  const filteredDocs = documents.filter(doc => {
    if (selectedType === 'ALL') return true;
    return doc.type === selectedType;
  });

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Documents Vault"
        subtitle="Digital copies of your road tax, insurance & receipts"
        showBack
        rightElement={
          <TouchableOpacity style={styles.addBtnHeader} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <Plus color="#FFFFFF" size={16} />
            <Text style={styles.addBtnText}>UPLOAD</Text>
          </TouchableOpacity>
        }
      />

      {/* Type Filter Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {(['ALL', 'Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, selectedType === t && styles.chipActive]}
            onPress={() => setSelectedType(t)}
          >
            <Text style={[styles.chipText, selectedType === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
        ) : filteredDocs.length === 0 ? (
          <View style={styles.emptyCard}>
            <FileText color={COLORS.textMuted} size={48} />
            <Text style={styles.emptyTitle}>NO DOCUMENTS</Text>
            <Text style={styles.emptySub}>Keep digital copies of your motorcycle papers handy anywhere.</Text>
            <CustomButton title="+ Upload Document" onPress={() => setModalVisible(true)} style={{ marginTop: 12 }} />
          </View>
        ) : (
          filteredDocs.map(doc => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docIconBox}>
                <FileCheck color={COLORS.primary} size={22} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>{doc.title}</Text>
                <Text style={styles.docMeta}>
                  {doc.type} {doc.expiry_date ? `• Expires: ${doc.expiry_date}` : ''}
                </Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(doc.id, doc.title)}>
                  <Trash2 color={COLORS.danger} size={16} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Upload Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Document</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>DOCUMENT TITLE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Etiqa Motorcycle Insurance 2026"
              placeholderTextColor={COLORS.textMuted}
              value={docTitle}
              onChangeText={setDocTitle}
            />

            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.catRow}>
              {(['Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, docCategory === cat && styles.catChipActive]}
                  onPress={() => setDocCategory(cat)}
                >
                  <Text style={[styles.catChipText, docCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>EXPIRY DATE (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={expiryDate}
              onChangeText={setExpiryDate}
            />

            <CustomButton
              title={submitting ? 'UPLOADING...' : 'SAVE TO VAULT'}
              onPress={handleAddDocument}
              disabled={submitting}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  addBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  chipTextActive: {
    color: COLORS.primary,
  },
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  docIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
  },
  docTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  docMeta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surfaceContainer,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  catChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  catChipTextActive: {
    color: COLORS.primary,
  },
});
