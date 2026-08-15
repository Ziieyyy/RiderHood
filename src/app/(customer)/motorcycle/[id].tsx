import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../../../constants/theme';
import { Header } from '../../../components/Header';
import { CustomButton } from '../../../components/CustomButton';
import {
  Bike,
  Clock,
  FileText,
  Trash2,
  Edit2,
  CheckCircle2,
  Eye,
  Download,
  X,
  Gauge,
  Disc,
  Camera,
  Plus,
  ChevronLeft,
  ChevronRight,
  Star,
  AlertCircle,
  Calendar,
} from 'lucide-react-native';
import {
  getMotorcycle,
  updateMotorcycle,
  deleteMotorcycle,
} from '../../../services/motorcycleService';
import {
  getReminders,
  getMaintenanceRecords,
  calculateHealthScore,
  updateReminderStatus,
  createReminder,
  deleteReminder,
  createMaintenanceRecord,
  deleteMaintenanceRecord,
} from '../../../services/maintenanceService';
import {
  getMotorcycleDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentExpiryStatus,
} from '../../../services/documentService';
import {
  getMotorcyclePhotos,
  uploadMotorcyclePhoto,
  deleteMotorcyclePhoto,
  setMainMotorcyclePhoto,
} from '../../../services/photoService';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import type {
  Motorcycle,
  MaintenanceReminder,
  MaintenanceRecord,
  Document as RiderDoc,
  DocumentType,
  MotorcyclePhoto,
  Booking,
} from '../../../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MotorcycleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  // Core Motorcycle Data State (Single Source of Truth)
  const [bike, setBike] = useState<Motorcycle | null>(null);
  const [photos, setPhotos] = useState<MotorcyclePhoto[]>([]);
  const [documents, setDocuments] = useState<RiderDoc[]>([]);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tabs State
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PHOTOS' | 'DOCUMENTS' | 'MAINTENANCE' | 'HISTORY' | 'BOOKINGS'>('OVERVIEW');

  // Single Page Inline Edit State (NO POPUP MODAL)
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editPlate, setEditPlate] = useState('');
  const [editEngineCc, setEditEngineCc] = useState('');
  const [editFuelType, setEditFuelType] = useState('');
  const [editTransmission, setEditTransmission] = useState('');
  const [editEngineOil, setEditEngineOil] = useState('');
  const [editFrontTyre, setEditFrontTyre] = useState('');
  const [editRearTyre, setEditRearTyre] = useState('');
  const [editLastServiceDate, setEditLastServiceDate] = useState('');
  const [editWarrantyExpiry, setEditWarrantyExpiry] = useState('');
  const [editMileage, setEditMileage] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [selectedDocFile, setSelectedDocFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  // Add Reminder Modal State
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderMileage, setNewReminderMileage] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);

  // Add Service Log Modal State
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [newRecordDesc, setNewRecordDesc] = useState('');
  const [newRecordMileage, setNewRecordMileage] = useState('');
  const [newRecordCost, setNewRecordCost] = useState('');
  const [newRecordDate, setNewRecordDate] = useState('');
  const [savingRecord, setSavingRecord] = useState(false);

  // Lightbox Photo Gallery Modal State
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Document Upload & Edit Modal State
  const [docFilter, setDocFilter] = useState<string>('All');
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('Insurance');
  const [newDocExpiryDate, setNewDocExpiryDate] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [editingDoc, setEditingDoc] = useState<RiderDoc | null>(null);
  const [showEditDocModal, setShowEditDocModal] = useState(false);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocType, setEditDocType] = useState<DocumentType>('Insurance');
  const [editDocExpiryDate, setEditDocExpiryDate] = useState('');
  const [savingEditDoc, setSavingEditDoc] = useState(false);

  // Document Viewer Modal State
  const [previewDoc, setPreviewDoc] = useState<RiderDoc | null>(null);
  const [docPreviewVisible, setDocPreviewVisible] = useState(false);

  // ─── LOAD ALL DATA BY MOTORCYCLE_ID (SINGLE SOURCE OF TRUTH) ────
  const loadMotorcycleData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const motorcycleData = await getMotorcycle(id);
      if (!motorcycleData) {
        setErrorMsg('Motorcycle not found in garage database.');
        setLoading(false);
        return;
      }

      const [pPhotos, pDocs, pReminders, pRecords, pScore, pBookingsRes] = await Promise.all([
        getMotorcyclePhotos(id),
        getMotorcycleDocuments(id),
        getReminders(id),
        getMaintenanceRecords(id),
        calculateHealthScore(id),
        supabase.from('bookings').select('*').eq('motorcycle_id', id).order('booking_date', { ascending: false }),
      ]);

      setBike(motorcycleData);
      setPhotos(pPhotos);
      setDocuments(pDocs);
      setReminders(pReminders);
      setRecords(pRecords);
      setHealthScore(pScore);
      setBookings(pBookingsRes.data ?? []);
    } catch (err: any) {
      console.error('Error loading motorcycle details:', err);
      setErrorMsg(err?.message || 'Unable to load motorcycle details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMotorcycleData();
  }, [loadMotorcycleData]);

  // ─── SINGLE EDIT MODE TOGGLE ──────────────────────────────────
  const startEditingAllData = () => {
    if (!bike) return;
    setEditNickname(bike.nickname || '');
    setEditBrand(bike.brand || '');
    setEditModel(bike.model || '');
    setEditYear(bike.year ? String(bike.year) : '');
    setEditPlate(bike.plate_number || '');
    setEditEngineCc(bike.engine_cc ? String(bike.engine_cc) : '');
    setEditFuelType(bike.fuel_type || 'Petrol');
    setEditTransmission(bike.transmission || 'Manual');
    setEditEngineOil(bike.engine_oil_type || '10W-40');
    setEditFrontTyre(bike.front_tyre_size || '90/80-17');
    setEditRearTyre(bike.rear_tyre_size || '120/70-17');
    setEditLastServiceDate(bike.last_service_date || '');
    setEditWarrantyExpiry(bike.warranty_expiry_date || '');
    setEditMileage(bike.current_mileage ? String(bike.current_mileage) : '');
    setEditPhotoUrl(bike.photo_url || '');
    setIsEditingMode(true);
  };

  const handleSaveAllData = async () => {
    if (!bike) return;
    if (!editBrand.trim() || !editModel.trim() || !editPlate.trim()) {
      Alert.alert('Incomplete Info', 'Brand, Model, and Registration Plate are required.');
      return;
    }

    setSavingEdit(true);
    try {
      const yr = parseInt(editYear, 10) || bike.year || new Date().getFullYear();
      const cc = parseInt(editEngineCc, 10) || null;
      const odo = parseInt(editMileage, 10) || bike.current_mileage || 0;

      const updated = await updateMotorcycle(bike.id, {
        nickname: editNickname.trim() || `${editBrand} ${editModel}`,
        brand: editBrand.trim(),
        model: editModel.trim(),
        year: yr,
        plate_number: editPlate.trim().toUpperCase(),
        engine_cc: cc,
        fuel_type: editFuelType.trim() || null,
        transmission: editTransmission.trim() || null,
        engine_oil_type: editEngineOil.trim() || null,
        front_tyre_size: editFrontTyre.trim() || null,
        rear_tyre_size: editRearTyre.trim() || null,
        last_service_date: editLastServiceDate.trim() || null,
        warranty_expiry_date: editWarrantyExpiry.trim() || null,
        current_mileage: odo,
        photo_url: editPhotoUrl.trim() || null,
      });

      setBike(updated);

      // Save document attachment if provided in edit form
      if (newDocTitle.trim() && user?.id) {
        const createdDoc = await createDocument({
          customer_id: user.id,
          motorcycle_id: bike.id,
          title: newDocTitle.trim(),
          type: newDocType,
          file_path: selectedDocFile ? selectedDocFile.uri : `documents/${user.id}/${bike.id}_${Date.now()}_${newDocTitle.replace(/\s+/g, '_')}.pdf`,
          expiry_date: newDocExpiryDate && newDocExpiryDate.trim() ? newDocExpiryDate.trim() : null,
        });

        setDocuments(prev => [createdDoc, ...prev]);
        setNewDocTitle('');
        setNewDocExpiryDate('');
        setSelectedDocFile(null);
      }

      setIsEditingMode(false);
      Alert.alert('Success', 'All motorcycle data & documents updated in database.');
    } catch (err: any) {
      Alert.alert('Update Error', err?.message || 'Failed to update motorcycle specs.');
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── PICK COVER PHOTO FOR EDIT FORM ───────────────────────────
  const handlePickCoverPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access gallery was not granted.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setEditPhotoUrl(result.assets[0].uri);
      }
    } catch (err: any) {
      console.log('Pick cover error:', err);
    }
  };

  // ─── PICK DIGITAL DOCUMENT FILE FOR EDIT FORM ────────────────
  const handlePickDocumentFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSelectedDocFile(res.assets[0]);
        if (!newDocTitle.trim()) {
          setNewDocTitle(res.assets[0].name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err: any) {
      console.log('Doc picker error:', err);
    }
  };

  // ─── MAINTENANCE REMINDER ACTIONS ──────────────────────────
  const handleCreateReminderSubmit = async () => {
    if (!bike || !newReminderTitle.trim()) {
      Alert.alert('Required', 'Reminder title is required.');
      return;
    }

    setSavingReminder(true);
    try {
      const km = parseInt(newReminderMileage, 10) || null;
      const created = await createReminder({
        motorcycle_id: bike.id,
        customer_id: bike.owner_id,
        title: newReminderTitle.trim(),
        next_service_mileage: km,
        next_service_date: newReminderDate && newReminderDate.trim() ? newReminderDate.trim() : null,
        status: 'upcoming',
      });

      setReminders(prev => [...prev, created]);
      const newScore = await calculateHealthScore(bike.id);
      setHealthScore(newScore);

      setNewReminderTitle('');
      setNewReminderMileage('');
      setNewReminderDate('');
      setShowAddReminderModal(false);
      Alert.alert('Success', 'Service reminder created.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create reminder.');
    } finally {
      setSavingReminder(false);
    }
  };

  const handleDeleteReminderAction = (remId: string, title: string) => {
    Alert.alert('Delete Reminder', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReminder(remId);
            setReminders(prev => prev.filter(r => r.id !== remId));
            if (bike) {
              const newScore = await calculateHealthScore(bike.id);
              setHealthScore(newScore);
            }
            Alert.alert('Deleted', `Reminder "${title}" removed.`);
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete reminder.');
          }
        },
      },
    ]);
  };

  // ─── SERVICE HISTORY LOG ACTIONS ──────────────────────────
  const handleCreateRecordSubmit = async () => {
    if (!bike || !user?.id || !newRecordDesc.trim()) {
      Alert.alert('Required', 'Service description is required.');
      return;
    }

    setSavingRecord(true);
    try {
      const km = parseInt(newRecordMileage, 10) || bike.current_mileage;
      const cost = parseFloat(newRecordCost) || 0;
      const sDate = newRecordDate && newRecordDate.trim() ? newRecordDate.trim() : new Date().toISOString().split('T')[0];

      const created = await createMaintenanceRecord({
        customer_id: user.id,
        motorcycle_id: bike.id,
        description: newRecordDesc.trim(),
        mileage: km,
        total_cost: cost,
        service_date: sDate,
      });

      setRecords(prev => [created, ...prev]);
      setNewRecordDesc('');
      setNewRecordMileage('');
      setNewRecordCost('');
      setNewRecordDate('');
      setShowAddRecordModal(false);
      Alert.alert('Success', 'Service history record saved.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create service log.');
    } finally {
      setSavingRecord(false);
    }
  };

  const handleDeleteRecordAction = (recordId: string, desc: string) => {
    Alert.alert('Delete Service Log', `Delete service record "${desc}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMaintenanceRecord(recordId);
            setRecords(prev => prev.filter(r => r.id !== recordId));
            Alert.alert('Deleted', 'Service record removed.');
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete service log.');
          }
        },
      },
    ]);
  };

  // ─── PHOTO GALLERY MANAGEMENT ──────────────────────────────
  const handleUploadPhoto = async () => {
    if (!bike || !user?.id) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access photo gallery was not granted.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingPhoto(true);
        const photoUri = result.assets[0].uri;

        const createdPhoto = await uploadMotorcyclePhoto(
          user.id,
          bike.id,
          photoUri,
          `photos/${user.id}/${bike.id}_${Date.now()}.jpg`,
          `Photo for ${bike.nickname || bike.model}`,
          photos.length === 0
        );

        setPhotos(prev => [createdPhoto, ...prev]);
        if (photos.length === 0) {
          setBike(prev => prev ? { ...prev, photo_url: photoUri } : null);
        }
        Alert.alert('Success', 'Motorcycle photo uploaded & saved to database.');
      }
    } catch (err: any) {
      console.error('Upload photo exception:', err);
      Alert.alert('Upload Error', err?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = (photo: MotorcyclePhoto) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this motorcycle photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMotorcyclePhoto(photo.id, photo.file_path);
            setPhotos(prev => prev.filter(p => p.id !== photo.id));
            if (lightboxVisible) setLightboxVisible(false);
            Alert.alert('Deleted', 'Photo removed from database.');
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete photo.');
          }
        },
      },
    ]);
  };

  const handleSetCoverPhoto = async (photo: MotorcyclePhoto) => {
    if (!bike) return;
    try {
      await setMainMotorcyclePhoto(bike.id, photo.id, photo.photo_url);
      setBike(prev => prev ? { ...prev, photo_url: photo.photo_url } : null);
      setPhotos(prev => prev.map(p => ({ ...p, is_main: p.id === photo.id })));
      Alert.alert('Success', 'Set as primary motorcycle cover photo.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to set cover photo.');
    }
  };

  // ─── DOCUMENT MANAGEMENT ───────────────────────────────────
  const handleViewDocument = (doc: RiderDoc) => {
    setPreviewDoc(doc);
    setDocPreviewVisible(true);
  };

  const handleUploadDocumentSubmit = async () => {
    if (!bike || !user?.id || !newDocTitle.trim()) {
      Alert.alert('Required', 'Please enter a document title.');
      return;
    }
    setUploadingDoc(true);
    try {
      const created = await createDocument({
        customer_id: user.id,
        motorcycle_id: bike.id,
        title: newDocTitle.trim(),
        type: newDocType,
        file_path: `documents/${user.id}/${bike.id}_${Date.now()}_${newDocTitle.replace(/\s+/g, '_')}.pdf`,
        expiry_date: newDocExpiryDate && newDocExpiryDate.trim() ? newDocExpiryDate.trim() : null,
      });

      setDocuments(prev => [created, ...prev]);
      setNewDocTitle('');
      setNewDocExpiryDate('');
      setShowUploadDocModal(false);
      Alert.alert('Success', 'Document uploaded and attached to motorcycle database.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const openEditDocModal = (doc: RiderDoc) => {
    setEditingDoc(doc);
    setEditDocTitle(doc.title);
    setEditDocType(doc.type);
    setEditDocExpiryDate(doc.expiry_date || '');
    setShowEditDocModal(true);
  };

  const handleSaveEditDocument = async () => {
    if (!editingDoc || !editDocTitle.trim()) {
      Alert.alert('Required', 'Document title is required.');
      return;
    }
    setSavingEditDoc(true);
    try {
      const updated = await updateDocument(editingDoc.id, {
        title: editDocTitle.trim(),
        type: editDocType,
        expiry_date: editDocExpiryDate && editDocExpiryDate.trim() ? editDocExpiryDate.trim() : null,
      });

      setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
      setShowEditDocModal(false);
      Alert.alert('Success', 'Document details updated.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update document.');
    } finally {
      setSavingEditDoc(false);
    }
  };

  const handleDeleteDocument = (docId: string, title: string) => {
    Alert.alert('Delete Document', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(docId);
            setDocuments(prev => prev.filter(d => d.id !== docId));
            Alert.alert('Deleted', `"${title}" has been deleted.`);
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete document.');
          }
        },
      },
    ]);
  };

  // ─── DANGER ZONE (DELETE MOTORCYCLE) ───────────────────────
  const handleDeleteBike = () => {
    if (!bike) return;
    Alert.alert(
      'Delete Motorcycle?',
      `Are you sure you want to delete ${bike.nickname || bike.model} (${bike.plate_number})?\n\nThis will remove access to its maintenance records and attached documents.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Motorcycle',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMotorcycle(bike.id);
              Alert.alert('Deleted', 'Motorcycle deleted from garage.');
              router.replace('/(customer)/garage');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete motorcycle.');
            }
          },
        },
      ]
    );
  };

  const filteredDocs = docFilter === 'All'
    ? documents
    : documents.filter(d => d.type === docFilter);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Motorcycle Detail" showBack />
        <View style={styles.loadingBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading database records for motorcycle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg || !bike) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Motorcycle Detail" showBack />
        <View style={styles.emptyCard}>
          <AlertCircle color={COLORS.danger} size={48} />
          <Text style={styles.emptyTitle}>Unable to load motorcycle details.</Text>
          <Text style={styles.emptySub}>{errorMsg || 'Database record not found.'}</Text>
          <CustomButton title="[ Try Again ]" onPress={loadMotorcycleData} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isHealthy = healthScore >= 80;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={isEditingMode ? 'Edit Motorcycle Specs' : (bike.nickname || `${bike.brand} ${bike.model}`)}
        subtitle={isEditingMode ? 'Update all motorcycle fields' : `${bike.plate_number} • Year ${bike.year}`}
        showBack
      />

      {!isEditingMode && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          {(['OVERVIEW', 'PHOTOS', 'DOCUMENTS', 'MAINTENANCE', 'HISTORY', 'BOOKINGS'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabItem, activeTab === t && styles.tabItemActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t === 'PHOTOS' ? `PHOTOS (${photos.length})` : t === 'DOCUMENTS' ? `DOCS (${documents.length})` : t}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ================= INLINE EDIT MODE (NO POPUP MODAL) ================= */}
        {isEditingMode ? (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.modalTitle}>✏️ Edit All Motorcycle Data</Text>
              <TouchableOpacity onPress={() => setIsEditingMode(false)}>
                <X color={COLORS.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.inputCategoryHeader}>1. IDENTITY & REGISTRATION</Text>

              <Text style={styles.inputLabel}>MOTORCYCLE NICKNAME</Text>
              <TextInput style={styles.modalInput} value={editNickname} onChangeText={setEditNickname} placeholder="e.g. Ahxia" placeholderTextColor={COLORS.textMuted} />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>BRAND *</Text>
                  <TextInput style={styles.modalInput} value={editBrand} onChangeText={setEditBrand} placeholder="PERODUA" placeholderTextColor={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>MODEL *</Text>
                  <TextInput style={styles.modalInput} value={editModel} onChangeText={setEditModel} placeholder="axia" placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>MANUFACTURING YEAR</Text>
                  <TextInput style={styles.modalInput} value={editYear} onChangeText={setEditYear} placeholder="2016" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>PLATE NUMBER *</Text>
                  <TextInput style={styles.modalInput} value={editPlate} onChangeText={setEditPlate} placeholder="ABC113" placeholderTextColor={COLORS.textMuted} autoCapitalize="characters" />
                </View>
              </View>

              <Text style={[styles.inputCategoryHeader, { marginTop: 14 }]}>2. ENGINE & TELEMETRY</Text>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>ENGINE CC</Text>
                  <TextInput style={styles.modalInput} value={editEngineCc} onChangeText={setEditEngineCc} placeholder="1500" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>CURRENT ODOMETER (KM)</Text>
                  <TextInput style={styles.modalInput} value={editMileage} onChangeText={setEditMileage} placeholder="2000" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>FUEL TYPE</Text>
                  <TextInput style={styles.modalInput} value={editFuelType} onChangeText={setEditFuelType} placeholder="Petrol" placeholderTextColor={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>TRANSMISSION</Text>
                  <TextInput style={styles.modalInput} value={editTransmission} onChangeText={setEditTransmission} placeholder="Manual" placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>

              <Text style={styles.inputLabel}>ENGINE OIL GRADE</Text>
              <TextInput style={styles.modalInput} value={editEngineOil} onChangeText={setEditEngineOil} placeholder="10W-40" placeholderTextColor={COLORS.textMuted} />

              <Text style={[styles.inputCategoryHeader, { marginTop: 14 }]}>3. SERVICE & WARRANTY DATES</Text>
              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>LAST SERVICE DATE</Text>
                  <TextInput style={styles.modalInput} value={editLastServiceDate} onChangeText={setEditLastServiceDate} placeholder="e.g. 2026-08-12" placeholderTextColor={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>WARRANTY EXPIRY</Text>
                  <TextInput style={styles.modalInput} value={editWarrantyExpiry} onChangeText={setEditWarrantyExpiry} placeholder="e.g. 2026-08-13" placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>

              <Text style={[styles.inputCategoryHeader, { marginTop: 14 }]}>4. TYRES & COVER PHOTO</Text>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>FRONT TYRE SIZE</Text>
                  <TextInput style={styles.modalInput} value={editFrontTyre} onChangeText={setEditFrontTyre} placeholder="100" placeholderTextColor={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>REAR TYRE SIZE</Text>
                  <TextInput style={styles.modalInput} value={editRearTyre} onChangeText={setEditRearTyre} placeholder="100" placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>

              <Text style={styles.inputLabel}>MAIN PHOTO FILE / URL</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[styles.modalInput, { flex: 1 }]} value={editPhotoUrl} onChangeText={setEditPhotoUrl} placeholder="file:///..." placeholderTextColor={COLORS.textMuted} />
                <TouchableOpacity style={styles.actionHeaderBtn} onPress={handlePickCoverPhoto}>
                  <Camera color={COLORS.primary} size={14} />
                  <Text style={styles.actionHeaderBtnText}>Pick Photo</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputCategoryHeader, { marginTop: 14 }]}>5. DIGITAL DOCUMENTS (ATTACHMENTS)</Text>

              {documents.length > 0 ? (
                documents.map(doc => (
                  <View key={doc.id} style={styles.docEditBox}>
                    <FileText color={COLORS.primary} size={16} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docItemTitle}>{doc.title}</Text>
                      <Text style={styles.docItemMeta}>{doc.type} • {doc.expiry_date ? `Expires: ${doc.expiry_date}` : 'No Expiry'}</Text>
                    </View>
                    <TouchableOpacity style={styles.docIconBtn} onPress={() => handleViewDocument(doc)}>
                      <Eye color={COLORS.primary} size={14} />
                      <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '800' }}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.docIconBtn, { borderColor: COLORS.dangerBg }]} onPress={() => handleDeleteDocument(doc.id, doc.title)}>
                      <Trash2 color={COLORS.danger} size={14} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={{ color: COLORS.textMuted, fontSize: 11, fontStyle: 'italic' }}>No digital documents attached yet.</Text>
              )}

              <Text style={[styles.inputLabel, { marginTop: 6 }]}>ATTACH NEW DOCUMENT TITLE</Text>
              <TextInput
                style={styles.modalInput}
                value={newDocTitle}
                onChangeText={setNewDocTitle}
                placeholder="e.g. Insurance Policy - ABC113"
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>CATEGORY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
                    {(['Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'] as DocumentType[]).map(t => (
                      <TouchableOpacity key={t} style={[styles.pill, newDocType === t && styles.pillActive]} onPress={() => setNewDocType(t)}>
                        <Text style={[styles.pillText, newDocType === t && styles.pillTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>EXPIRY DATE (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newDocExpiryDate}
                    onChangeText={setNewDocExpiryDate}
                    placeholder="e.g. 2026-08-10"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>

              <TouchableOpacity style={[styles.actionHeaderBtn, { marginTop: 6 }]} onPress={handlePickDocumentFile}>
                <FileText color={COLORS.primary} size={14} />
                <Text style={styles.actionHeaderBtnText}>
                  {selectedDocFile ? `📄 ${selectedDocFile.name}` : '+ Pick PDF / Image File'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditingMode(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <CustomButton
                title={savingEdit ? 'SAVING CHANGES...' : 'SAVE MOTORCYCLE DATA'}
                onPress={handleSaveAllData}
                disabled={savingEdit}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <>
            {/* ================= 1. OVERVIEW TAB ================= */}
            {activeTab === 'OVERVIEW' && (
              <>
                {/* HERO COVER BANNER */}
                <View style={styles.card}>
                  <View style={styles.bikeImagePlaceholder}>
                    {bike.photo_url ? (
                      <Image source={{ uri: bike.photo_url }} style={{ width: '100%', height: '100%', borderRadius: 16 }} resizeMode="cover" />
                    ) : (
                      <Bike color={COLORS.primary} size={64} />
                    )}
                    <View style={styles.plateOverlayTag}>
                      <Text style={styles.plateOverlayText}>{bike.plate_number}</Text>
                    </View>
                  </View>

                  <View style={styles.headerInfoRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bikeTitleText}>{bike.nickname || `${bike.brand} ${bike.model}`}</Text>
                      <Text style={styles.bikeSubtitleText}>{bike.brand} {bike.model} • Year {bike.year}</Text>
                    </View>
                    {/* SINGLE PRIMARY EDIT BUTTON ON PAGE */}
                    <TouchableOpacity style={styles.editSpecsBtn} onPress={startEditingAllData}>
                      <Edit2 color={COLORS.primary} size={14} />
                      <Text style={styles.editSpecsBtnText}>[ Edit Motorcycle ]</Text>
                    </TouchableOpacity>
                  </View>

                  {/* QUICK STATUS BAR */}
                  <View style={styles.healthScoreBanner}>
                    <View style={styles.scoreCircle}>
                      <Text style={styles.scoreVal}>{healthScore}</Text>
                      <Text style={styles.scoreUnit}>/100</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.healthHeaderRow}>
                        <Text style={styles.scoreTitle}>HEALTH STATUS</Text>
                        <View style={[styles.statusBadge, { backgroundColor: isHealthy ? COLORS.successBg : '#fef3c7' }]}>
                          <Text style={[styles.statusBadgeText, { color: isHealthy ? COLORS.success : '#d97706' }]}>
                            {isHealthy ? 'Good (100%)' : 'Needs Service'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.scoreSub}>
                        {isHealthy ? 'Optimal Condition. Engine & maintenance items clear.' : 'Service due. Check maintenance reminders tab.'}
                      </Text>
                    </View>
                  </View>

                  {/* QUICK TELEMETRY */}
                  <View style={styles.telemetryGrid}>
                    <View style={styles.telemetryCard}>
                      <Gauge color={COLORS.primary} size={18} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.telemetryLabel}>CURRENT ODOMETER</Text>
                        <Text style={styles.telemetryVal}>{bike.current_mileage.toLocaleString()} km</Text>
                      </View>
                    </View>

                    <View style={styles.telemetryCard}>
                      <Disc color={COLORS.primary} size={18} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.telemetryLabel}>RECOMMENDED TYRES</Text>
                        <Text style={styles.telemetryVal}>{bike.front_tyre_size || '100'} / {bike.rear_tyre_size || '100'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* SPECIFICATIONS GRID */}
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitleHeader}>MOTORCYCLE SPECIFICATIONS</Text>
                  </View>

                  <View style={styles.specsGrid}>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Brand</Text>
                      <Text style={styles.specVal}>{bike.brand}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Model</Text>
                      <Text style={styles.specVal}>{bike.model}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Year</Text>
                      <Text style={styles.specVal}>{bike.year}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Plate Number</Text>
                      <Text style={[styles.specVal, { color: COLORS.primary }]}>{bike.plate_number}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Engine CC</Text>
                      <Text style={styles.specVal}>{bike.engine_cc ? `${bike.engine_cc} cc` : 'N/A'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Fuel</Text>
                      <Text style={styles.specVal}>{bike.fuel_type || 'Petrol'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Transmission</Text>
                      <Text style={styles.specVal}>{bike.transmission || 'Manual'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Engine Oil</Text>
                      <Text style={styles.specVal}>{bike.engine_oil_type || '10W-40'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Last Service Date</Text>
                      <Text style={styles.specVal}>{bike.last_service_date || 'N/A'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Warranty Expiry</Text>
                      <Text style={styles.specVal}>{bike.warranty_expiry_date || 'N/A'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Tyre Size</Text>
                      <Text style={styles.specVal}>{bike.front_tyre_size || '100'} / {bike.rear_tyre_size || '100'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Current Odometer</Text>
                      <Text style={[styles.specVal, { color: COLORS.primary }]}>{bike.current_mileage.toLocaleString()} km</Text>
                    </View>
                  </View>
                </View>

                <CustomButton
                  title="📅 BOOK WORKSHOP SERVICE"
                  onPress={() => router.push('/(customer)/booking')}
                />
              </>
            )}

            {/* ================= 2. MOTORCYCLE PHOTOS TAB ================= */}
            {activeTab === 'PHOTOS' && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleHeader}>MOTORCYCLE PHOTOS ({photos.length})</Text>
                  <TouchableOpacity style={styles.actionHeaderBtn} onPress={handleUploadPhoto} disabled={uploadingPhoto}>
                    <Camera color={COLORS.primary} size={14} />
                    <Text style={styles.actionHeaderBtnText}>{uploadingPhoto ? 'Uploading...' : '+ Upload Photos'}</Text>
                  </TouchableOpacity>
                </View>

                {photos.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Camera color={COLORS.textMuted} size={40} />
                    <Text style={styles.emptyTitle}>No motorcycle photos uploaded yet.</Text>
                    <Text style={styles.emptySub}>Upload photos of your motorcycle to store in your digital garage vault.</Text>
                    <CustomButton title="[Upload Photos]" onPress={handleUploadPhoto} style={{ marginTop: 12 }} />
                  </View>
                ) : (
                  <View style={styles.photoGrid}>
                    {photos.map((p, idx) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.photoGridItem}
                        onPress={() => {
                          setActivePhotoIndex(idx);
                          setLightboxVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: p.photo_url }} style={styles.photoThumbImg} resizeMode="cover" />
                        {p.is_main && (
                          <View style={styles.mainPhotoTag}>
                            <Star color={COLORS.primary} size={10} fill={COLORS.primary} />
                            <Text style={styles.mainPhotoTagText}>Main</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ================= 3. MOTORCYCLE DOCUMENTS TAB ================= */}
            {activeTab === 'DOCUMENTS' && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleHeader}>MOTORCYCLE DOCUMENTS ({documents.length})</Text>
                  <TouchableOpacity style={styles.actionHeaderBtn} onPress={() => setShowUploadDocModal(true)}>
                    <Plus color={COLORS.primary} size={14} />
                    <Text style={styles.actionHeaderBtnText}>+ Upload Document</Text>
                  </TouchableOpacity>
                </View>

                {/* Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillsRow}>
                  {['All', 'Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.pill, docFilter === type && styles.pillActive]}
                      onPress={() => setDocFilter(type)}
                    >
                      <Text style={[styles.pillText, docFilter === type && styles.pillTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {filteredDocs.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <FileText color={COLORS.textMuted} size={40} />
                    <Text style={styles.emptyTitle}>No motorcycle documents uploaded yet.</Text>
                    <Text style={styles.emptySub}>Keep digital road tax, insurance policies, and service receipts attached directly to this motorcycle.</Text>
                    <CustomButton title="[Upload Document]" onPress={() => setShowUploadDocModal(true)} style={{ marginTop: 12 }} />
                  </View>
                ) : (
                  filteredDocs.map(doc => {
                    const expInfo = getDocumentExpiryStatus(doc.expiry_date);
                    const isExp = expInfo.status === 'expired';
                    const isExpSoon = expInfo.status === 'expiring_soon';

                    return (
                      <View key={doc.id} style={styles.docCard}>
                        <FileText color={COLORS.primary} size={24} />
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => openEditDocModal(doc)}>
                          <Text style={styles.docCardTitle}>{doc.title}</Text>
                          <Text style={styles.docCardSub}>
                            {doc.type} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                          </Text>
                          {doc.expiry_date ? (
                            <Text style={styles.docCardExpiry}>Expires: {doc.expiry_date}</Text>
                          ) : null}
                        </TouchableOpacity>

                        {/* Expiry Badge */}
                        {doc.expiry_date && (
                          <View style={[
                            styles.expBadge,
                            isExp ? styles.expBadgeExpired : isExpSoon ? styles.expBadgeSoon : styles.expBadgeValid
                          ]}>
                            <Text style={[
                              styles.expBadgeText,
                              isExp ? styles.expTextExpired : isExpSoon ? styles.expTextSoon : styles.expTextValid
                            ]}>
                              {expInfo.label}
                            </Text>
                          </View>
                        )}

                        <TouchableOpacity
                          style={[styles.docIconBtn, { borderColor: COLORS.dangerBg, marginLeft: 8 }]}
                          onPress={() => handleDeleteDocument(doc.id, doc.title)}
                        >
                          <Trash2 color={COLORS.danger} size={14} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ================= 4. MAINTENANCE REMINDERS TAB ================= */}
            {activeTab === 'MAINTENANCE' && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleHeader}>MAINTENANCE REMINDERS ({reminders.length})</Text>
                  <TouchableOpacity style={styles.actionHeaderBtn} onPress={() => setShowAddReminderModal(true)}>
                    <Plus color={COLORS.primary} size={14} />
                    <Text style={styles.actionHeaderBtnText}>+ Add Reminder</Text>
                  </TouchableOpacity>
                </View>

                {reminders.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <CheckCircle2 color={COLORS.success} size={40} />
                    <Text style={styles.emptyTitle}>NO PENDING SERVICE REMINDERS</Text>
                    <Text style={styles.emptySub}>All maintenance intervals for this motorcycle are up to date.</Text>
                    <CustomButton title="+ Create Reminder" onPress={() => setShowAddReminderModal(true)} style={{ marginTop: 12 }} />
                  </View>
                ) : (
                  reminders.map(rem => (
                    <View key={rem.id} style={styles.remCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.remTitle}>{rem.title}</Text>
                        <Text style={styles.remSub}>
                          Target: {rem.next_service_mileage ? `${rem.next_service_mileage.toLocaleString()} km` : rem.next_service_date ? `Date: ${rem.next_service_date}` : 'Scheduled Interval'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        {rem.status !== 'completed' && (
                          <TouchableOpacity
                            style={styles.doneBtn}
                            onPress={async () => {
                              await updateReminderStatus(rem.id, 'completed');
                              setReminders(prev => prev.map(r => r.id === rem.id ? { ...r, status: 'completed' } : r));
                              if (bike) {
                                const sc = await calculateHealthScore(bike.id);
                                setHealthScore(sc);
                              }
                            }}
                          >
                            <Text style={styles.doneBtnText}>✓ DONE</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.docIconBtn, { borderColor: COLORS.dangerBg }]}
                          onPress={() => handleDeleteReminderAction(rem.id, rem.title)}
                        >
                          <Trash2 color={COLORS.danger} size={14} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ================= 5. SERVICE HISTORY TAB ================= */}
            {activeTab === 'HISTORY' && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleHeader}>SERVICE HISTORY ({records.length})</Text>
                  <TouchableOpacity style={styles.actionHeaderBtn} onPress={() => setShowAddRecordModal(true)}>
                    <Plus color={COLORS.primary} size={14} />
                    <Text style={styles.actionHeaderBtnText}>+ Add Service Log</Text>
                  </TouchableOpacity>
                </View>

                {records.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Clock color={COLORS.textMuted} size={40} />
                    <Text style={styles.emptyTitle}>No service history yet.</Text>
                    <Text style={styles.emptySub}>Book a service with a RiderHood partner workshop to build your digital service log.</Text>
                    <CustomButton title="+ Add Service Log" onPress={() => setShowAddRecordModal(true)} style={{ marginTop: 12 }} />
                  </View>
                ) : (
                  records.map(rec => (
                    <View key={rec.id} style={styles.remCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.remTitle}>{rec.description || 'Routine Maintenance'}</Text>
                        <Text style={styles.remSub}>
                          {rec.service_date} • {rec.mileage ? `${rec.mileage.toLocaleString()} km` : 'N/A'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.costText}>RM {rec.total_cost ? Number(rec.total_cost).toFixed(2) : '0.00'}</Text>
                        <TouchableOpacity
                          style={[styles.docIconBtn, { borderColor: COLORS.dangerBg }]}
                          onPress={() => handleDeleteRecordAction(rec.id, rec.description || 'Service Log')}
                        >
                          <Trash2 color={COLORS.danger} size={14} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ================= 6. BOOKINGS TAB ================= */}
            {activeTab === 'BOOKINGS' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitleHeader}>BOOKING HISTORY ({bookings.length})</Text>
                {bookings.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Calendar color={COLORS.textMuted} size={40} />
                    <Text style={styles.emptyTitle}>No bookings for this motorcycle.</Text>
                    <Text style={styles.emptySub}>Book a workshop appointment to view booking records here.</Text>
                  </View>
                ) : (
                  bookings.map(b => (
                    <View key={b.id} style={styles.remCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.remTitle}>Appointment on {b.booking_date}</Text>
                        <Text style={styles.remSub}>Status: {b.status.toUpperCase()} • Time: {b.booking_time}</Text>
                      </View>
                      <Text style={styles.costText}>RM {Number(b.total_amount || 0).toFixed(2)}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* DANGER ZONE */}
            <View style={styles.dangerZoneCard}>
              <Text style={styles.dangerTitle}>DANGER ZONE</Text>
              <Text style={styles.dangerSub}>Permanently delete this motorcycle record and clear garage access.</Text>
              <TouchableOpacity style={styles.deleteBikeBtn} onPress={handleDeleteBike}>
                <Trash2 color={COLORS.danger} size={16} />
                <Text style={styles.deleteBikeBtnText}>Delete Motorcycle</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ADD MAINTENANCE REMINDER MODAL */}
      <Modal visible={showAddReminderModal} transparent animationType="fade" onRequestClose={() => setShowAddReminderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.modalTitle}>+ Create Service Reminder</Text>
            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>REMINDER TITLE *</Text>
              <TextInput style={styles.modalInput} value={newReminderTitle} onChangeText={setNewReminderTitle} placeholder="e.g. Engine Oil Service Interval" placeholderTextColor={COLORS.textMuted} />

              <Text style={styles.inputLabel}>TARGET MILEAGE (KM)</Text>
              <TextInput style={styles.modalInput} value={newReminderMileage} onChangeText={setNewReminderMileage} placeholder="e.g. 5000" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />

              <Text style={styles.inputLabel}>TARGET SERVICE DATE (YYYY-MM-DD)</Text>
              <TextInput style={styles.modalInput} value={newReminderDate} onChangeText={setNewReminderDate} placeholder="e.g. 2026-12-01" placeholderTextColor={COLORS.textMuted} />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddReminderModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <CustomButton title={savingReminder ? 'SAVING...' : 'SAVE REMINDER'} onPress={handleCreateReminderSubmit} disabled={savingReminder} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD SERVICE LOG RECORD MODAL */}
      <Modal visible={showAddRecordModal} transparent animationType="fade" onRequestClose={() => setShowAddRecordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.modalTitle}>+ Add Service History Record</Text>
            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>SERVICE DESCRIPTION *</Text>
              <TextInput style={styles.modalInput} value={newRecordDesc} onChangeText={setNewRecordDesc} placeholder="e.g. Full Oil Change & Filter Replacement" placeholderTextColor={COLORS.textMuted} />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>MILEAGE (KM)</Text>
                  <TextInput style={styles.modalInput} value={newRecordMileage} onChangeText={setNewRecordMileage} placeholder="2000" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>TOTAL COST (RM)</Text>
                  <TextInput style={styles.modalInput} value={newRecordCost} onChangeText={setNewRecordCost} placeholder="120.00" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.inputLabel}>SERVICE DATE (YYYY-MM-DD)</Text>
              <TextInput style={styles.modalInput} value={newRecordDate} onChangeText={setNewRecordDate} placeholder="e.g. 2026-08-11" placeholderTextColor={COLORS.textMuted} />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddRecordModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <CustomButton title={savingRecord ? 'SAVING...' : 'SAVE SERVICE LOG'} onPress={handleCreateRecordSubmit} disabled={savingRecord} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* FULLSCREEN LIGHTBOX GALLERY MODAL */}
      <Modal visible={lightboxVisible} transparent animationType="fade" onRequestClose={() => setLightboxVisible(false)}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setLightboxVisible(false)}>
            <X color="#FFFFFF" size={24} />
          </TouchableOpacity>

          {photos.length > 0 && photos[activePhotoIndex] && (
            <View style={styles.lightboxMainContainer}>
              <Image source={{ uri: photos[activePhotoIndex].photo_url }} style={styles.lightboxImg} resizeMode="contain" />

              <View style={styles.lightboxMetaRow}>
                <Text style={styles.lightboxCounter}>{activePhotoIndex + 1} of {photos.length}</Text>
                <TouchableOpacity style={styles.lightboxActionBtn} onPress={() => handleSetCoverPhoto(photos[activePhotoIndex])}>
                  <Star color={photos[activePhotoIndex].is_main ? COLORS.primary : '#FFF'} size={16} fill={photos[activePhotoIndex].is_main ? COLORS.primary : 'transparent'} />
                  <Text style={styles.lightboxActionText}>{photos[activePhotoIndex].is_main ? 'Main Cover' : 'Set as Main'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.lightboxActionBtn} onPress={() => handleDeletePhoto(photos[activePhotoIndex])}>
                  <Trash2 color={COLORS.danger} size={16} />
                  <Text style={[styles.lightboxActionText, { color: COLORS.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>

              {/* NAV CHEVRONS */}
              {activePhotoIndex > 0 && (
                <TouchableOpacity style={styles.navLeft} onPress={() => setActivePhotoIndex(prev => prev - 1)}>
                  <ChevronLeft color="#FFF" size={32} />
                </TouchableOpacity>
              )}

              {activePhotoIndex < photos.length - 1 && (
                <TouchableOpacity style={styles.navRight} onPress={() => setActivePhotoIndex(prev => prev + 1)}>
                  <ChevronRight color="#FFF" size={32} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* UPLOAD DOCUMENT MODAL */}
      <Modal visible={showUploadDocModal} transparent animationType="fade" onRequestClose={() => setShowUploadDocModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.modalTitle}>Upload Motorcycle Document</Text>
            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>DOCUMENT TITLE *</Text>
              <TextInput style={styles.modalInput} value={newDocTitle} onChangeText={setNewDocTitle} placeholder="e.g. Insurance Policy - ABC113" placeholderTextColor={COLORS.textMuted} />

              <Text style={styles.inputLabel}>DOCUMENT CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
                {(['Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'] as DocumentType[]).map(t => (
                  <TouchableOpacity key={t} style={[styles.pill, newDocType === t && styles.pillActive]} onPress={() => setNewDocType(t)}>
                    <Text style={[styles.pillText, newDocType === t && styles.pillTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>EXPIRY DATE (OPTIONAL - YYYY-MM-DD)</Text>
              <TextInput style={styles.modalInput} value={newDocExpiryDate} onChangeText={setNewDocExpiryDate} placeholder="e.g. 2026-08-10" placeholderTextColor={COLORS.textMuted} />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowUploadDocModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <CustomButton title={uploadingDoc ? 'UPLOADING...' : 'SAVE DOCUMENT'} onPress={handleUploadDocumentSubmit} disabled={uploadingDoc} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT DOCUMENT MODAL */}
      <Modal visible={showEditDocModal} transparent animationType="fade" onRequestClose={() => setShowEditDocModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.modalTitle}>✏️ Edit Document Details</Text>
            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>DOCUMENT TITLE *</Text>
              <TextInput style={styles.modalInput} value={editDocTitle} onChangeText={setEditDocTitle} placeholder="Document Title" placeholderTextColor={COLORS.textMuted} />

              <Text style={styles.inputLabel}>DOCUMENT TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
                {(['Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'] as DocumentType[]).map(t => (
                  <TouchableOpacity key={t} style={[styles.pill, editDocType === t && styles.pillActive]} onPress={() => setEditDocType(t)}>
                    <Text style={[styles.pillText, editDocType === t && styles.pillTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>EXPIRY DATE (YYYY-MM-DD)</Text>
              <TextInput style={styles.modalInput} value={editDocExpiryDate} onChangeText={setEditDocExpiryDate} placeholder="e.g. 2026-08-10" placeholderTextColor={COLORS.textMuted} />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditDocModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <CustomButton title={savingEditDoc ? 'SAVING...' : 'SAVE CHANGES'} onPress={handleSaveEditDocument} disabled={savingEditDoc} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* FULLSCREEN DOCUMENT VIEWER MODAL */}
      <Modal visible={docPreviewVisible} transparent animationType="slide" onRequestClose={() => setDocPreviewVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <FileText color={COLORS.primary} size={20} />
                <Text style={styles.modalTitle} numberOfLines={1}>{previewDoc?.title || 'Document Viewer'}</Text>
              </View>
              <TouchableOpacity onPress={() => setDocPreviewVisible(false)}>
                <X color={COLORS.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {previewDoc && (
                <View style={{ gap: 12 }}>
                  {/* Meta Header */}
                  <View style={{ backgroundColor: COLORS.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '900' }}>CATEGORY: {previewDoc.type.toUpperCase()}</Text>
                      {previewDoc.expiry_date && (
                        <View style={[
                          styles.expBadge,
                          getDocumentExpiryStatus(previewDoc.expiry_date).status === 'expired'
                            ? styles.expBadgeExpired
                            : getDocumentExpiryStatus(previewDoc.expiry_date).status === 'expiring_soon'
                            ? styles.expBadgeSoon
                            : styles.expBadgeValid
                        ]}>
                          <Text style={[
                            styles.expBadgeText,
                            getDocumentExpiryStatus(previewDoc.expiry_date).status === 'expired'
                              ? styles.expTextExpired
                              : getDocumentExpiryStatus(previewDoc.expiry_date).status === 'expiring_soon'
                              ? styles.expTextSoon
                              : styles.expTextValid
                          ]}>
                            {getDocumentExpiryStatus(previewDoc.expiry_date).label}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>
                      Uploaded: {new Date(previewDoc.created_at).toLocaleDateString()}
                    </Text>
                    {previewDoc.expiry_date && (
                      <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>
                        Expiry Date: {previewDoc.expiry_date}
                      </Text>
                    )}
                  </View>

                  {/* Document File Content Preview Box */}
                  <View style={{ height: 260, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                    {previewDoc.file_path && (previewDoc.file_path.endsWith('.jpg') || previewDoc.file_path.endsWith('.jpeg') || previewDoc.file_path.endsWith('.png') || previewDoc.file_path.startsWith('file://')) ? (
                      <Image source={{ uri: previewDoc.file_path }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                    ) : (
                      <View style={{ alignItems: 'center', padding: 20, gap: 10 }}>
                        <FileText color={COLORS.primary} size={48} />
                        <Text style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: '800', textAlign: 'center' }}>{previewDoc.title}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 10, textAlign: 'center' }}>Path: {previewDoc.file_path || 'Attached Record'}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              {previewDoc?.file_path ? (
                <CustomButton
                  title="OPEN FULL FILE"
                  onPress={() => {
                    if (previewDoc.file_path) {
                      Linking.openURL(previewDoc.file_path).catch(() => {
                        Alert.alert('Opening File', `Viewing ${previewDoc.title} document file.`);
                      });
                    }
                  }}
                  style={{ flex: 1 }}
                />
              ) : null}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDocPreviewVisible(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 13 },
  iconHeaderEditBtn: { padding: 8, backgroundColor: COLORS.surfaceContainer, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primaryGlow },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surfaceContainer, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 12 },
  tabItem: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800' },
  tabTextActive: { color: COLORS.primary },
  card: { backgroundColor: COLORS.surfaceContainer, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 14 },
  bikeImagePlaceholder: { height: 170, backgroundColor: COLORS.surface, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', position: 'relative' },
  plateOverlayTag: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.primary },
  plateOverlayText: { color: COLORS.primary, fontSize: 12, fontWeight: '900' },
  headerInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bikeTitleText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  bikeSubtitleText: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  editSpecsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryDark, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  editSpecsBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  healthScoreBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.primaryGlow, gap: 12 },
  scoreCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primaryDark, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
  scoreVal: { color: COLORS.primary, fontSize: 18, fontWeight: '900' },
  scoreUnit: { color: COLORS.textMuted, fontSize: 8, fontWeight: '800' },
  healthHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreTitle: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { fontSize: 9, fontWeight: '900' },
  scoreSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  telemetryGrid: { flexDirection: 'row', gap: 10 },
  telemetryCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  telemetryLabel: { color: COLORS.textMuted, fontSize: 8, fontWeight: '800' },
  telemetryVal: { color: COLORS.primary, fontSize: 12, fontWeight: '900', marginTop: 2 },
  sectionTitleHeader: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  specsGrid: { gap: 10 },
  specBox: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  specLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  specVal: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '800' },
  section: { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryDark, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  actionHeaderBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoGridItem: { width: (SCREEN_WIDTH - 52) / 3, height: (SCREEN_WIDTH - 52) / 3, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, position: 'relative' },
  photoThumbImg: { width: '100%', height: '100%' },
  mainPhotoTag: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: COLORS.primary },
  mainPhotoTagText: { color: COLORS.primary, fontSize: 8, fontWeight: '900' },
  filterPillsRow: { flexDirection: 'row', marginVertical: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.surfaceContainer, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  pillActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  pillText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  pillTextActive: { color: COLORS.primary, fontWeight: '900' },
  docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceContainer, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  docCardTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  docCardSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  docCardExpiry: { color: COLORS.primary, fontSize: 10, fontWeight: '700', marginTop: 2 },
  expBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  expBadgeValid: { backgroundColor: COLORS.successBg, borderColor: COLORS.success },
  expBadgeSoon: { backgroundColor: '#fef3c7', borderColor: '#d97706' },
  expBadgeExpired: { backgroundColor: COLORS.dangerBg, borderColor: COLORS.danger },
  expBadgeText: { fontSize: 8, fontWeight: '900' },
  expTextValid: { color: COLORS.success },
  expTextSoon: { color: '#d97706' },
  expTextExpired: { color: COLORS.danger },
  docActionGroup: { flexDirection: 'row', gap: 4 },
  docIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  remCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceContainer, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  remTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  remSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  doneBtn: { backgroundColor: COLORS.successBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.success },
  doneBtnText: { color: COLORS.success, fontSize: 10, fontWeight: '900' },
  costText: { color: COLORS.primary, fontSize: 13, fontWeight: '900' },
  emptyCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  emptySub: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'center' },
  dangerZoneCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.dangerBg, gap: 6, marginTop: 12 },
  dangerTitle: { color: COLORS.danger, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  dangerSub: { color: COLORS.textSecondary, fontSize: 11 },
  deleteBikeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.dangerBg, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.danger, marginTop: 6 },
  deleteBikeBtnText: { color: COLORS.danger, fontSize: 12, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  editModalCard: { width: '100%', backgroundColor: COLORS.surfaceContainer, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border, gap: 14 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  modalInputGroup: { gap: 10 },
  inputCategoryHeader: { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  inputLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800' },
  modalInput: { backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, height: 42, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, fontSize: 13 },
  twoColRow: { flexDirection: 'row', gap: 10 },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800' },
  lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  lightboxCloseBtn: { position: 'absolute', top: 44, right: 20, zIndex: 10, padding: 8 },
  lightboxMainContainer: { width: SCREEN_WIDTH, height: '80%', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  lightboxImg: { width: SCREEN_WIDTH * 0.9, height: '80%' },
  lightboxMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, position: 'absolute', bottom: 20, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  lightboxCounter: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  lightboxActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lightboxActionText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  navLeft: { position: 'absolute', left: 10, top: '45%', padding: 12 },
  navRight: { position: 'absolute', right: 10, top: '45%', padding: 12 },
  docEditBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, gap: 10, marginBottom: 6 },
  docItemTitle: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '800' },
  docItemMeta: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
});
