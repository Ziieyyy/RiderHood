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
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, DARK_COLORS } from '../../constants/theme';
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
  Upload,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';
import {
  getCustomerDocuments,
  createDocument,
  deleteDocument,
  deleteDocumentWithStorage,
  uploadAndCreateDocument,
  replaceDocumentFile,
  getPublicDocumentUrl,
  getSignedDocumentUrl,
  openDocumentFile,
  validateDocumentFile,
} from '../../services/documentService';
import {
  openDocument,
  getDocumentFileType,
} from '../../services/documentViewerService';
import type { Document as RiderDoc, DocumentType } from '../../types/database';
import { useTranslation } from '../../i18n';

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isPhone, contentPadding } = useResponsive();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [documents, setDocuments] = useState<RiderDoc[]>([]);
  const [selectedType, setSelectedType] = useState<DocumentType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentType>('Insurance');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<RiderDoc | null>(null);
  const [docPreviewVisible, setDocPreviewVisible] = useState(false);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
  const [loadingPreviewUrl, setLoadingPreviewUrl] = useState(false);
  const [previewUrlError, setPreviewUrlError] = useState<string | null>(null);

  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  const fetchSignedUrlForDoc = async (doc: RiderDoc) => {
    setLoadingPreviewUrl(true);
    setPreviewUrlError(null);
    setPreviewSignedUrl(null);
    try {
      const path = doc.file_path || doc.file_url || '';
      const { signedUrl, error, objectExists } = await getSignedDocumentUrl(path);
      if (signedUrl && objectExists !== false) {
        setPreviewSignedUrl(signedUrl);
      } else {
        setPreviewUrlError(error || 'This document file is missing from cloud storage.');
      }
    } catch (err: any) {
      setPreviewUrlError('Unable to access document storage.');
    } finally {
      setLoadingPreviewUrl(false);
    }
  };

  const handleViewDocument = async (doc: RiderDoc) => {
    try {
      setOpeningDocId(doc.id);
      const path = doc.file_path || doc.file_url || '';
      const fileType = getDocumentFileType(path, doc.type);

      const { signedUrl, error, objectExists } = await getSignedDocumentUrl(path);

      if (!signedUrl || objectExists === false) {
        setPreviewDoc(doc);
        setPreviewUrlError(error || 'This document file is missing from cloud storage.');
        setDocPreviewVisible(true);
        return;
      }

      if (fileType === 'image') {
        setPreviewDoc(doc);
        setPreviewSignedUrl(signedUrl);
        setPreviewUrlError(null);
        setDocPreviewVisible(true);
      } else {
        await openDocument(signedUrl, fileType);
      }
    } catch (err: any) {
      console.error('DOCUMENT VAULT VIEW ERROR:', err);
      Alert.alert(
        t('errors.documentLoadError'),
        err?.message || t('errors.documentLoadError')
      );
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleReplacePreviewDocFile = async () => {
    if (!previewDoc || !user?.id) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const selectedFile = res.assets[0];
        setLoadingPreviewUrl(true);

        const newPath = await replaceDocumentFile(
          previewDoc.id,
          previewDoc.file_path,
          selectedFile,
          user.id
        );

        const updatedDoc = { ...previewDoc, file_path: newPath };
        setPreviewDoc(updatedDoc);
        setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));

        Alert.alert(t('common.success'), t('motorcycle.uploadDocument'));
        await fetchSignedUrlForDoc(updatedDoc);
      }
    } catch (err: any) {
      Alert.alert(t('errors.uploadFailed'), err?.message || t('errors.uploadFailed'));
    } finally {
      setLoadingPreviewUrl(false);
    }
  };

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

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSelectedFile(res.assets[0]);
        if (!docTitle.trim()) {
          setDocTitle(res.assets[0].name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err: any) {
      console.log('Document pick error:', err);
    }
  };

  const handleAddDocument = async () => {
    if (!user?.id || !docTitle.trim()) {
      Alert.alert(t('common.required'), t('errors.requiredField'));
      return;
    }
    if (!selectedFile || !selectedFile.uri) {
      Alert.alert(t('common.required'), t('motorcycle.tapToUpload'));
      return;
    }

    const valRes = validateDocumentFile(selectedFile);
    if (!valRes.valid) {
      Alert.alert('Invalid File', valRes.error || 'Please attach a valid file.');
      return;
    }

    setSubmitting(true);
    try {
      await uploadAndCreateDocument({
        customer_id: user.id,
        title: docTitle.trim(),
        type: docCategory,
        file: selectedFile,
        expiry_date: expiryDate.trim() || undefined,
      });

      Alert.alert(t('common.success'), t('common.success'));
      setModalVisible(false);
      setDocTitle('');
      setExpiryDate('');
      setSelectedFile(null);
      fetchDocs();
    } catch (err: any) {
      Alert.alert(t('errors.uploadFailed'), err?.message || t('errors.uploadFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (doc: RiderDoc) => {
    Alert.alert(t('dialogs.deleteDocumentTitle'), t('dialogs.deleteDocumentMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocumentWithStorage(doc.id, doc.file_path);
            setDocuments(prev => prev.filter(d => d.id !== doc.id));
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.message || t('errors.deleteFailed'));
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
        title={t('motorcycle.documents')}
        subtitle={t('empty.noDocumentsSub')}
        showBack
        rightElement={
          <TouchableOpacity style={styles.addBtnHeader} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <Plus color="#FFFFFF" size={16} />
            <Text style={styles.addBtnText}>{t('common.upload').toUpperCase()}</Text>
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

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding }]}>
        <ResponsiveContainer>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
          ) : filteredDocs.length === 0 ? (
            <View style={styles.emptyCard}>
              <FileText color={COLORS.textMuted} size={48} />
              <Text style={styles.emptyTitle}>{t('empty.noDocuments').toUpperCase()}</Text>
              <Text style={styles.emptySub}>{t('empty.noDocumentsSub')}</Text>
              <CustomButton title={`+ ${t('motorcycle.uploadDocument')}`} onPress={() => setModalVisible(true)} style={{ marginTop: 12 }} />
            </View>
          ) : (
            <ResponsiveGrid columns={{ phone: 1, tablet: 2, desktop: 3 }} gap={16}>
              {filteredDocs.map(doc => (
                <View key={doc.id} style={styles.docCard}>
                  <View style={styles.docIconBox}>
                    <FileCheck color={COLORS.primary} size={22} />
                  </View>

                  <TouchableOpacity style={{ flex: 1 }} onPress={() => handleViewDocument(doc)}>
                    <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                    <Text style={styles.docMeta} numberOfLines={1}>
                      {doc.type} {doc.expiry_date ? `• Expires: ${doc.expiry_date}` : ''}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.viewDocBtn} onPress={() => handleViewDocument(doc)}>
                      <Eye color={COLORS.primary} size={14} />
                      <Text style={styles.viewDocBtnText}>{t('common.view')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(doc)}>
                      <Trash2 color={COLORS.danger} size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ResponsiveGrid>
          )}
        </ResponsiveContainer>
      </ScrollView>

      {/* Upload Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('motorcycle.uploadDocument')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t('motorcycle.uploadDocument').toUpperCase()}</Text>
            <TouchableOpacity style={styles.filePickerBox} onPress={handlePickFile}>
              <FileText color={COLORS.primary} size={18} />
              <Text style={styles.filePickerText}>
                {selectedFile ? selectedFile.name : `+ ${t('motorcycle.tapToUpload')}`}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>{t('motorcycle.documents').toUpperCase()}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Etiqa Motorcycle Insurance 2026"
              placeholderTextColor={COLORS.textMuted}
              value={docTitle}
              onChangeText={setDocTitle}
            />

            <Text style={styles.label}>{t('services.categoryLabel').toUpperCase()}</Text>
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

            <Text style={styles.label}>{t('motorcycle.expiryDate').toUpperCase()} ({t('common.optional').toUpperCase()})</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={expiryDate}
              onChangeText={setExpiryDate}
            />

            <CustomButton
              title={submitting ? t('common.uploading') : t('common.save').toUpperCase()}
              onPress={handleAddDocument}
              disabled={submitting}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
      {/* Document Viewer Modal */}
      <Modal visible={docPreviewVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📄 {t('motorcycle.viewDocument')}</Text>
              <TouchableOpacity onPress={() => setDocPreviewVisible(false)}>
                <X color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {previewDoc && (
                <View style={{ gap: 12 }}>
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' }}>{previewDoc.title}</Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>{t('services.categoryLabel')}: {previewDoc.type}</Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>
                      {t('common.upload')}: {new Date(previewDoc.created_at).toLocaleDateString()}
                    </Text>
                    {previewDoc.expiry_date && (
                      <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>
                        {t('motorcycle.expiryDate')}: {previewDoc.expiry_date}
                      </Text>
                    )}
                  </View>

                  <View style={{ height: 240, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', padding: 16 }}>
                    {(() => {
                      if (loadingPreviewUrl) {
                        return (
                          <View style={{ alignItems: 'center', gap: 10 }}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>{t('common.loading')}</Text>
                          </View>
                        );
                      }

                      if (previewUrlError) {
                        return (
                          <View style={{ alignItems: 'center', gap: 10, padding: 12 }}>
                            <FileText color={COLORS.danger} size={40} />
                            <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                              {t('motorcycle.docNotFound')}
                            </Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 11, textAlign: 'center' }}>
                              {t('motorcycle.docNotFoundDesc')}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                              <TouchableOpacity
                                style={{ backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                onPress={handleReplacePreviewDocFile}
                              >
                                <Upload color="#FFFFFF" size={14} />
                                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>+ {t('motorcycle.uploadDocument')}</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{ backgroundColor: COLORS.surface, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}
                                onPress={() => previewDoc && fetchSignedUrlForDoc(previewDoc)}
                              >
                                <Text style={{ color: COLORS.textSecondary, fontWeight: '700', fontSize: 12 }}>{t('common.retry')}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      }

                      const activeUrl = previewSignedUrl || '';
                      if (!activeUrl) {
                        return (
                          <View style={{ alignItems: 'center', padding: 20, gap: 10 }}>
                            <FileText color={COLORS.primary} size={44} />
                            <Text style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: '800', textAlign: 'center' }}>{previewDoc.title}</Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 10, textAlign: 'center' }}>Storage Path: {previewDoc.file_path || 'Attached File'}</Text>
                          </View>
                        );
                      }

                      // Modal only shows for images (PDFs are routed to browser by handleViewDocument)
                      return <Image source={{ uri: activeUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;
                    })()}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <CustomButton
                title="OPEN FULL FILE"
                onPress={async () => {
                  if (previewSignedUrl) {
                    try {
                      await openDocument(previewSignedUrl);
                    } catch (err: any) {
                      Alert.alert('Error', err?.message || 'Unable to open document.');
                    }
                  }
                }}
                style={{ flex: 1 }}
              />
              <TouchableOpacity
                style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center' }}
                onPress={() => setDocPreviewVisible(false)}
              >
                <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '800' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 110,
      gap: 10,
    },
    addBtnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    addBtnText: {
      color: isDark ? '#000000' : '#FFFFFF',
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
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
    },
    chipTextActive: {
      color: colors.primary,
    },
    emptyCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 20,
      gap: 8,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    emptySub: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
    },
    docCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    docIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primaryGlow,
    },
    docTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    docMeta: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    cardActions: {
      flexDirection: 'row',
      gap: 6,
    },
    iconBtn: {
      padding: 8,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surfaceContainer,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
    },
    label: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      marginTop: 4,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      color: colors.textPrimary,
      fontSize: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filePickerBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    filePickerText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catChipActive: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primary,
    },
    catChipText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    catChipTextActive: {
      color: colors.primary,
    },
    viewDocBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.primaryDark,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    viewDocBtnText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
  });
