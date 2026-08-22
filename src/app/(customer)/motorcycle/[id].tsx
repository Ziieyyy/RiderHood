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
  Platform,
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
  Upload,
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
  getPublicDocumentUrl,
  getSignedDocumentUrl,
  uploadAndCreateDocument,
  deleteDocumentWithStorage,
  replaceDocumentFile,
  validateDocumentFile,
  openDocumentFile,
} from '../../../services/documentService';
import {
  getMotorcyclePhotos,
  uploadMotorcyclePhoto,
  deleteMotorcyclePhoto,
  setMainMotorcyclePhoto,
} from '../../../services/photoService';
import {
  openDocument,
  getDocumentFileType,
} from '../../../services/documentViewerService';
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
import { useTranslation } from '../../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MotorcycleDetailScreen() {
  const { t } = useTranslation();
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
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
  const [loadingPreviewUrl, setLoadingPreviewUrl] = useState(false);
  const [previewUrlError, setPreviewUrlError] = useState<string | null>(null);
  const [selectedEditDocFile, setSelectedEditDocFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

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

      // Save document attachment if provided in edit form — ONLY if an actual file is selected
      if (newDocTitle.trim() && user?.id && selectedDocFile) {
        const createdDoc = await uploadAndCreateDocument({
          customer_id: user.id,
          motorcycle_id: bike.id,
          title: newDocTitle.trim(),
          type: newDocType,
          file: selectedDocFile,
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
    Alert.alert(t('dialogs.deletePhotoTitle'), t('dialogs.deletePhotoMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMotorcyclePhoto(photo.id, photo.file_path);
            setPhotos(prev => prev.filter(p => p.id !== photo.id));
            if (lightboxVisible) setLightboxVisible(false);
            Alert.alert(t('common.success'), t('common.delete'));
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.message || t('errors.deleteFailed'));
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
      console.error('MOTORCYCLE DOCUMENT VIEW ERROR:', err);
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
          user.id,
          bike?.id
        );

        const updatedDoc = { ...previewDoc, file_path: newPath };
        setPreviewDoc(updatedDoc);
        setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));

        Alert.alert('Success', 'Document file uploaded and attached to Supabase Storage.');
        await fetchSignedUrlForDoc(updatedDoc);
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Failed to upload document file.');
    } finally {
      setLoadingPreviewUrl(false);
    }
  };

  const handleUploadDocumentSubmit = async () => {
    if (!bike || !user?.id || !newDocTitle.trim()) {
      Alert.alert('Required', 'Please enter a document title.');
      return;
    }
    if (!selectedDocFile || !selectedDocFile.uri) {
      Alert.alert('Required', 'Please select a document file (PDF, JPG, PNG, WEBP).');
      return;
    }

    const valRes = validateDocumentFile(selectedDocFile);
    if (!valRes.valid) {
      Alert.alert('Invalid File', valRes.error || 'Please attach a valid PDF or image file.');
      return;
    }

    setUploadingDoc(true);
    try {
      const created = await uploadAndCreateDocument({
        customer_id: user.id,
        motorcycle_id: bike.id,
        title: newDocTitle.trim(),
        type: newDocType,
        file: selectedDocFile,
        expiry_date: newDocExpiryDate && newDocExpiryDate.trim() ? newDocExpiryDate.trim() : null,
      });

      setDocuments(prev => [created, ...prev]);
      setNewDocTitle('');
      setNewDocExpiryDate('');
      setSelectedDocFile(null);
      setShowUploadDocModal(false);
      Alert.alert('Success', 'Document uploaded and attached to motorcycle database.');
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Unable to upload document. Please try again.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const openEditDocModal = (doc: RiderDoc) => {
    setEditingDoc(doc);
    setEditDocTitle(doc.title);
    setEditDocType(doc.type);
    setEditDocExpiryDate(doc.expiry_date || '');
    setSelectedEditDocFile(null);
    setShowEditDocModal(true);
  };

  const handlePickEditDocFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSelectedEditDocFile(res.assets[0]);
      }
    } catch (err: any) {
      console.log('Edit doc picker error:', err);
    }
  };

  const handleSaveEditDocument = async () => {
    if (!editingDoc || !editDocTitle.trim()) {
      Alert.alert('Required', 'Document title is required.');
      return;
    }
    setSavingEditDoc(true);
    try {
      let finalPath = editingDoc.file_path;
      if (selectedEditDocFile && selectedEditDocFile.uri && user?.id) {
        finalPath = await replaceDocumentFile(
          editingDoc.id,
          editingDoc.file_path,
          selectedEditDocFile,
          user.id,
          bike?.id
        );
      }

      const updated = await updateDocument(editingDoc.id, {
        title: editDocTitle.trim(),
        type: editDocType,
        file_path: finalPath,
        expiry_date: editDocExpiryDate && editDocExpiryDate.trim() ? editDocExpiryDate.trim() : null,
      });

      setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
      setShowEditDocModal(false);
      setSelectedEditDocFile(null);
      Alert.alert('Success', 'Document details updated.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update document.');
    } finally {
      setSavingEditDoc(false);
    }
  };

  const handleDeleteDocument = (doc: RiderDoc) => {
    Alert.alert('Delete Document', `Are you sure you want to delete "${doc.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocumentWithStorage(doc.id, doc.file_path);
            setDocuments(prev => prev.filter(d => d.id !== doc.id));
            Alert.alert('Deleted', `"${doc.title}" has been deleted.`);
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
        subtitle={isEditingMode ? t('motorcycle.updateMotorcycle') : `${bike.plate_number} • ${t('motorcycle.year')} ${bike.year}`}
        showBack
      />

      {!isEditingMode && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          {(['OVERVIEW', 'PHOTOS', 'DOCUMENTS', 'MAINTENANCE', 'HISTORY', 'BOOKINGS'] as const).map(tabKey => (
            <TouchableOpacity
              key={tabKey}
              style={[styles.tabItem, activeTab === tabKey && styles.tabItemActive]}
              onPress={() => setActiveTab(tabKey)}
            >
              <Text style={[styles.tabText, activeTab === tabKey && styles.tabTextActive]}>
                {tabKey === 'PHOTOS' ? `${t('common.photos').toUpperCase()} (${photos.length})` : tabKey === 'DOCUMENTS' ? `${t('motorcycle.documents').toUpperCase()} (${documents.length})` : tabKey === 'MAINTENANCE' ? t('navigation.maintenance').toUpperCase() : tabKey === 'HISTORY' ? t('maintenance.serviceHistory').toUpperCase() : tabKey === 'BOOKINGS' ? t('navigation.bookings').toUpperCase() : t('common.overview').toUpperCase()}
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
              <Text style={styles.modalTitle}>✏️ {t('motorcycle.edit')}</Text>
              <TouchableOpacity onPress={() => setIsEditingMode(false)}>
                <X color={COLORS.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.inputCategoryHeader}>{t('motorcycle.step1BasicInfo').toUpperCase()}</Text>

              <Text style={styles.inputLabel}>{t('motorcycle.nickname').toUpperCase()}</Text>
              <TextInput style={styles.modalInput} value={editNickname} onChangeText={setEditNickname} placeholder={t('motorcycle.nicknamePlaceholder')} placeholderTextColor={COLORS.textMuted} />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.brand').toUpperCase()} *</Text>
                  <TextInput style={styles.modalInput} value={editBrand} onChangeText={setEditBrand} placeholder={t('motorcycle.selectBrand')} placeholderTextColor={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.model').toUpperCase()} *</Text>
                  <TextInput style={styles.modalInput} value={editModel} onChangeText={setEditModel} placeholder={t('motorcycle.selectModel')} placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.year').toUpperCase()}</Text>
                  <TextInput style={styles.modalInput} value={editYear} onChangeText={setEditYear} placeholder={t('motorcycle.yearPlaceholder')} placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.plateNumber').toUpperCase()} *</Text>
                  <TextInput style={styles.modalInput} value={editPlate} onChangeText={setEditPlate} placeholder={t('motorcycle.plateNumberPlaceholder')} placeholderTextColor={COLORS.textMuted} autoCapitalize="characters" />
                </View>
              </View>

              <Text style={[styles.inputCategoryHeader, { marginTop: 14 }]}>{t('motorcycle.technicalInfo').toUpperCase()}</Text>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.engineCapacity').toUpperCase()}</Text>
                  <TextInput style={styles.modalInput} value={editEngineCc} onChangeText={setEditEngineCc} placeholder="1500" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.currentOdometer').toUpperCase()}</Text>
                  <TextInput style={styles.modalInput} value={editMileage} onChangeText={setEditMileage} placeholder="2000" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.fuelType').toUpperCase()}</Text>
                  <TextInput style={styles.modalInput} value={editFuelType} onChangeText={setEditFuelType} placeholder={t('motorcycle.selectFuelType')} placeholderTextColor={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.transmission').toUpperCase()}</Text>
                  <TextInput style={styles.modalInput} value={editTransmission} onChangeText={setEditTransmission} placeholder={t('motorcycle.selectTransmission')} placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>

              <Text style={styles.inputLabel}>{t('motorcycle.engineOilGrade').toUpperCase()}</Text>
              <TextInput style={styles.modalInput} value={editEngineOil} onChangeText={setEditEngineOil} placeholder="10W-40" placeholderTextColor={COLORS.textMuted} />

              <Text style={[styles.inputCategoryHeader, { marginTop: 14 }]}>{t('motorcycle.statusAndMileage').toUpperCase()}</Text>
              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.lastServiceDate').toUpperCase()}</Text>
                  <TextInput style={styles.modalInput} value={editLastServiceDate} onChangeText={setEditLastServiceDate} placeholder="e.g. 2026-08-12" placeholderTextColor={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.warrantyExpiry').toUpperCase()}</Text>
                  <TextInput style={styles.modalInput} value={editWarrantyExpiry} onChangeText={setEditWarrantyExpiry} placeholder="e.g. 2026-08-13" placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>

              <Text style={[styles.inputCategoryHeader, { marginTop: 14 }]}>{t('motorcycle.photoAndDocs').toUpperCase()}</Text>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.tyreFront').toUpperCase()}</Text>
                  <TextInput style={styles.modalInput} value={editFrontTyre} onChangeText={setEditFrontTyre} placeholder="100" placeholderTextColor={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.tyreRear').toUpperCase()}</Text>
                  <TextInput style={styles.modalInput} value={editRearTyre} onChangeText={setEditRearTyre} placeholder="100" placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>

              <Text style={styles.inputLabel}>{t('motorcycle.photoUrl').toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[styles.modalInput, { flex: 1 }]} value={editPhotoUrl} onChangeText={setEditPhotoUrl} placeholder="file:///..." placeholderTextColor={COLORS.textMuted} />
                <TouchableOpacity style={styles.actionHeaderBtn} onPress={handlePickCoverPhoto}>
                  <Camera color={COLORS.primary} size={14} />
                  <Text style={styles.actionHeaderBtnText}>{t('common.photos')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputCategoryHeader, { marginTop: 14 }]}>{t('motorcycle.digitalVault').toUpperCase()}</Text>

              {documents.length > 0 ? (
                documents.map(doc => (
                  <View key={doc.id} style={styles.docEditBox}>
                    <FileText color={COLORS.primary} size={16} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docItemTitle}>{doc.title}</Text>
                      <Text style={styles.docItemMeta}>{doc.type} • {doc.expiry_date ? `${t('motorcycle.expiryDate')}: ${doc.expiry_date}` : ''}</Text>
                    </View>
                    <TouchableOpacity style={styles.docIconBtn} onPress={() => handleViewDocument(doc)}>
                      <Eye color={COLORS.primary} size={14} />
                      <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '800' }}>{t('common.view')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.docIconBtn, { borderColor: COLORS.dangerBg }]} onPress={() => handleDeleteDocument(doc)}>
                      <Trash2 color={COLORS.danger} size={14} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={{ color: COLORS.textMuted, fontSize: 11, fontStyle: 'italic' }}>{t('empty.noDocuments')}</Text>
              )}

              <Text style={[styles.inputLabel, { marginTop: 6 }]}>{t('motorcycle.uploadDocument').toUpperCase()}</Text>
              <TextInput
                style={styles.modalInput}
                value={newDocTitle}
                onChangeText={setNewDocTitle}
                placeholder={t('motorcycle.uploadDocument')}
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('common.category').toUpperCase()}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
                    {(['Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'] as DocumentType[]).map(tType => (
                      <TouchableOpacity key={tType} style={[styles.pill, newDocType === tType && styles.pillActive]} onPress={() => setNewDocType(tType)}>
                        <Text style={[styles.pillText, newDocType === tType && styles.pillTextActive]}>{tType}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('motorcycle.expiryDate').toUpperCase()} (YYYY-MM-DD)</Text>
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
                  {selectedDocFile ? `📄 ${selectedDocFile.name}` : `+ ${t('motorcycle.tapToUpload')}`}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditingMode(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <CustomButton
                title={savingEdit ? t('common.saving').toUpperCase() : t('common.saveChanges').toUpperCase()}
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
                      <Text style={styles.bikeSubtitleText}>{bike.brand} {bike.model} • {t('motorcycle.year')} {bike.year}</Text>
                    </View>
                    {/* SINGLE PRIMARY EDIT BUTTON ON PAGE */}
                    <TouchableOpacity style={styles.editSpecsBtn} onPress={startEditingAllData}>
                      <Edit2 color={COLORS.primary} size={14} />
                      <Text style={styles.editSpecsBtnText}>[ {t('motorcycle.edit')} ]</Text>
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
                        <Text style={styles.scoreTitle}>{t('motorcycle.healthScore').toUpperCase()}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: isHealthy ? COLORS.successBg : '#fef3c7' }]}>
                          <Text style={[styles.statusBadgeText, { color: isHealthy ? COLORS.success : '#d97706' }]}>
                            {isHealthy ? `${t('motorcycle.healthGood')} (100%)` : t('motorcycle.healthPoor')}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.scoreSub}>
                        {isHealthy ? t('dashboard.goodCondition') : t('motorcycle.healthScoreDesc')}
                      </Text>
                    </View>
                  </View>

                  {/* QUICK TELEMETRY */}
                  <View style={styles.telemetryGrid}>
                    <View style={styles.telemetryCard}>
                      <Gauge color={COLORS.primary} size={18} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.telemetryLabel}>{t('motorcycle.currentOdometer').toUpperCase()}</Text>
                        <Text style={styles.telemetryVal}>{bike.current_mileage.toLocaleString()} km</Text>
                      </View>
                    </View>

                    <View style={styles.telemetryCard}>
                      <Disc color={COLORS.primary} size={18} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.telemetryLabel}>{t('motorcycle.tyreSize').toUpperCase()}</Text>
                        <Text style={styles.telemetryVal}>{bike.front_tyre_size || '100'} / {bike.rear_tyre_size || '100'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* SPECIFICATIONS GRID */}
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitleHeader}>{t('motorcycle.specs').toUpperCase()}</Text>
                  </View>

                  <View style={styles.specsGrid}>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.brand')}</Text>
                      <Text style={styles.specVal}>{bike.brand}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.model')}</Text>
                      <Text style={styles.specVal}>{bike.model}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.year')}</Text>
                      <Text style={styles.specVal}>{bike.year}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.plateNumber')}</Text>
                      <Text style={[styles.specVal, { color: COLORS.primary }]}>{bike.plate_number}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.engineCapacity')}</Text>
                      <Text style={styles.specVal}>{bike.engine_cc ? `${bike.engine_cc} cc` : 'N/A'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.fuelType')}</Text>
                      <Text style={styles.specVal}>{bike.fuel_type || 'Petrol'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.transmission')}</Text>
                      <Text style={styles.specVal}>{bike.transmission || 'Manual'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.engineOil')}</Text>
                      <Text style={styles.specVal}>{bike.engine_oil_type || '10W-40'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.lastServiceDate')}</Text>
                      <Text style={styles.specVal}>{bike.last_service_date || 'N/A'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.warrantyExpiry')}</Text>
                      <Text style={styles.specVal}>{bike.warranty_expiry_date || 'N/A'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.tyreSize')}</Text>
                      <Text style={styles.specVal}>{bike.front_tyre_size || '100'} / {bike.rear_tyre_size || '100'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>{t('motorcycle.currentOdometer')}</Text>
                      <Text style={[styles.specVal, { color: COLORS.primary }]}>{bike.current_mileage.toLocaleString()} km</Text>
                    </View>
                  </View>
                </View>

                <CustomButton
                  title={`📅 ${t('common.bookNow').toUpperCase()}`}
                  onPress={() => router.push('/(customer)/booking')}
                />
              </>
            )}

            {/* ================= 2. MOTORCYCLE PHOTOS TAB ================= */}
            {activeTab === 'PHOTOS' && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleHeader}>{t('common.photos').toUpperCase()} ({photos.length})</Text>
                  <TouchableOpacity style={styles.actionHeaderBtn} onPress={handleUploadPhoto} disabled={uploadingPhoto}>
                    <Camera color={COLORS.primary} size={14} />
                    <Text style={styles.actionHeaderBtnText}>{uploadingPhoto ? t('common.uploading') : `+ ${t('common.upload')} ${t('common.photos')}`}</Text>
                  </TouchableOpacity>
                </View>

                {photos.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Camera color={COLORS.textMuted} size={40} />
                    <Text style={styles.emptyTitle}>{t('motorcycle.noPhotoSelected')}</Text>
                    <Text style={styles.emptySub}>{t('motorcycle.photoAndDocsDesc')}</Text>
                    <CustomButton title={`[${t('common.upload')} ${t('common.photos')}]`} onPress={handleUploadPhoto} style={{ marginTop: 12 }} />
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
                            <Text style={styles.mainPhotoTagText}>{t('motorcycle.primaryBadge')}</Text>
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
                  <Text style={styles.sectionTitleHeader}>{t('motorcycle.documents').toUpperCase()} ({documents.length})</Text>
                  <TouchableOpacity style={styles.actionHeaderBtn} onPress={() => setShowUploadDocModal(true)}>
                    <Plus color={COLORS.primary} size={14} />
                    <Text style={styles.actionHeaderBtnText}>+ {t('motorcycle.uploadDocument')}</Text>
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
                    <Text style={styles.emptyTitle}>{t('empty.noDocuments')}</Text>
                    <Text style={styles.emptySub}>{t('empty.noDocumentsSub')}</Text>
                    <CustomButton title={`[${t('motorcycle.uploadDocument')}]`} onPress={() => setShowUploadDocModal(true)} style={{ marginTop: 12 }} />
                  </View>
                ) : (
                  filteredDocs.map(doc => {
                    const expInfo = getDocumentExpiryStatus(doc.expiry_date);
                    const isExp = expInfo.status === 'expired';
                    const isExpSoon = expInfo.status === 'expiring_soon';

                    return (
                      <View key={doc.id} style={styles.docCard}>
                        <View style={styles.docCardHeader}>
                          <FileText color={COLORS.primary} size={24} />
                          <TouchableOpacity style={{ flex: 1 }} onPress={() => handleViewDocument(doc)}>
                            <Text style={styles.docCardTitle}>{doc.title}</Text>
                            <Text style={styles.docCardSub}>
                              {doc.type} • {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                            </Text>
                            {doc.expiry_date ? (
                              <Text style={styles.docCardExpiry}>{t('motorcycle.expiryDate')}: {doc.expiry_date}</Text>
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
                        </View>

                        <View style={styles.docActionRow}>
                          <TouchableOpacity
                            style={styles.viewDocBtn}
                            onPress={() => handleViewDocument(doc)}
                            disabled={openingDocId === doc.id}
                          >
                            {openingDocId === doc.id ? (
                              <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : (
                              <Eye color={COLORS.primary} size={14} />
                            )}
                            <Text style={styles.viewDocBtnText}>
                              {openingDocId === doc.id ? t('common.loading') : t('motorcycle.viewDocument')}
                            </Text>
                          </TouchableOpacity>

                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={styles.docIconBtn}
                              onPress={() => openEditDocModal(doc)}
                            >
                              <Edit2 color={COLORS.textSecondary} size={14} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.docIconBtn, { borderColor: COLORS.dangerBg }]}
                              onPress={() => handleDeleteDocument(doc)}
                            >
                              <Trash2 color={COLORS.danger} size={14} />
                            </TouchableOpacity>
                          </View>
                        </View>
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
                  <Text style={styles.sectionTitleHeader}>{t('maintenance.reminder').toUpperCase()} ({reminders.length})</Text>
                  <TouchableOpacity style={styles.actionHeaderBtn} onPress={() => setShowAddReminderModal(true)}>
                    <Plus color={COLORS.primary} size={14} />
                    <Text style={styles.actionHeaderBtnText}>+ {t('common.add')} {t('maintenance.reminder')}</Text>
                  </TouchableOpacity>
                </View>

                {reminders.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <CheckCircle2 color={COLORS.success} size={40} />
                    <Text style={styles.emptyTitle}>{t('maintenance.upToDate').toUpperCase()}</Text>
                    <Text style={styles.emptySub}>{t('motorcycle.healthScoreDesc')}</Text>
                    <CustomButton title={`+ ${t('common.add')} ${t('maintenance.reminder')}`} onPress={() => setShowAddReminderModal(true)} style={{ marginTop: 12 }} />
                  </View>
                ) : (
                  reminders.map(rem => (
                    <View key={rem.id} style={styles.remCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.remTitle}>{rem.title}</Text>
                        <Text style={styles.remSub}>
                          {t('maintenance.dueSoon')}: {rem.next_service_mileage ? `${rem.next_service_mileage.toLocaleString()} km` : rem.next_service_date ? `${t('common.date')}: ${rem.next_service_date}` : ''}
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
                            <Text style={styles.doneBtnText}>✓ {t('common.done').toUpperCase()}</Text>
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
                  <Text style={styles.sectionTitleHeader}>{t('maintenance.serviceHistory').toUpperCase()} ({records.length})</Text>
                  <TouchableOpacity style={styles.actionHeaderBtn} onPress={() => setShowAddRecordModal(true)}>
                    <Plus color={COLORS.primary} size={14} />
                    <Text style={styles.actionHeaderBtnText}>+ {t('maintenance.addLog')}</Text>
                  </TouchableOpacity>
                </View>

                {records.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Clock color={COLORS.textMuted} size={40} />
                    <Text style={styles.emptyTitle}>{t('empty.noMaintenanceLogs')}</Text>
                    <Text style={styles.emptySub}>{t('empty.noMaintenanceLogsSub')}</Text>
                    <CustomButton title={`+ ${t('maintenance.addLog')}`} onPress={() => setShowAddRecordModal(true)} style={{ marginTop: 12 }} />
                  </View>
                ) : (
                  records.map(rec => (
                    <View key={rec.id} style={styles.remCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.remTitle}>{rec.description || t('maintenance.generalService')}</Text>
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
                <Text style={styles.sectionTitleHeader}>{t('navigation.bookings').toUpperCase()} ({bookings.length})</Text>
                {bookings.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Calendar color={COLORS.textMuted} size={40} />
                    <Text style={styles.emptyTitle}>{t('empty.noBookings')}</Text>
                    <Text style={styles.emptySub}>{t('empty.noBookingsSub')}</Text>
                  </View>
                ) : (
                  bookings.map(b => (
                    <View key={b.id} style={styles.remCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.remTitle}>{t('booking.bookingDate')}: {b.booking_date}</Text>
                        <Text style={styles.remSub}>{t('common.status')}: {b.status.toUpperCase()} • {t('common.time')}: {b.booking_time}</Text>
                      </View>
                      <Text style={styles.costText}>RM {Number(b.total_amount || 0).toFixed(2)}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* DANGER ZONE */}
            <View style={styles.dangerZoneCard}>
              <Text style={styles.dangerTitle}>{t('common.dangerZone')}</Text>
              <Text style={styles.dangerSub}>{t('dialogs.deleteMotorcycleMessage')}</Text>
              <TouchableOpacity style={styles.deleteBikeBtn} onPress={handleDeleteBike}>
                <Trash2 color={COLORS.danger} size={16} />
                <Text style={styles.deleteBikeBtnText}>{t('motorcycle.delete')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ADD MAINTENANCE REMINDER MODAL */}
      <Modal visible={showAddReminderModal} transparent animationType="fade" onRequestClose={() => setShowAddReminderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.modalTitle}>+ {t('common.add')} {t('maintenance.reminder')}</Text>
            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>{t('common.name').toUpperCase()} *</Text>
              <TextInput style={styles.modalInput} value={newReminderTitle} onChangeText={setNewReminderTitle} placeholder="e.g. Engine Oil Service Interval" placeholderTextColor={COLORS.textMuted} />

              <Text style={styles.inputLabel}>{t('motorcycle.nextServiceTarget').toUpperCase()}</Text>
              <TextInput style={styles.modalInput} value={newReminderMileage} onChangeText={setNewReminderMileage} placeholder="e.g. 5000" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />

              <Text style={styles.inputLabel}>{t('maintenance.nextServiceDue').toUpperCase()} (YYYY-MM-DD)</Text>
              <TextInput style={styles.modalInput} value={newReminderDate} onChangeText={setNewReminderDate} placeholder="e.g. 2026-12-01" placeholderTextColor={COLORS.textMuted} />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddReminderModal(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <CustomButton title={savingReminder ? t('common.saving').toUpperCase() : t('common.save').toUpperCase()} onPress={handleCreateReminderSubmit} disabled={savingReminder} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD SERVICE LOG RECORD MODAL */}
      <Modal visible={showAddRecordModal} transparent animationType="fade" onRequestClose={() => setShowAddRecordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.modalTitle}>+ {t('maintenance.addLog')}</Text>
            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>{t('common.description').toUpperCase()} *</Text>
              <TextInput style={styles.modalInput} value={newRecordDesc} onChangeText={setNewRecordDesc} placeholder="e.g. Full Oil Change & Filter Replacement" placeholderTextColor={COLORS.textMuted} />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('maintenance.mileageAtService').toUpperCase()}</Text>
                  <TextInput style={styles.modalInput} value={newRecordMileage} onChangeText={setNewRecordMileage} placeholder="2000" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('maintenance.cost').toUpperCase()} (RM)</Text>
                  <TextInput style={styles.modalInput} value={newRecordCost} onChangeText={setNewRecordCost} placeholder="120.00" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.inputLabel}>{t('maintenance.serviceDate').toUpperCase()} (YYYY-MM-DD)</Text>
              <TextInput style={styles.modalInput} value={newRecordDate} onChangeText={setNewRecordDate} placeholder="e.g. 2026-08-11" placeholderTextColor={COLORS.textMuted} />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddRecordModal(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <CustomButton title={savingRecord ? t('common.saving').toUpperCase() : t('common.save').toUpperCase()} onPress={handleCreateRecordSubmit} disabled={savingRecord} style={{ flex: 1 }} />
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
                <Text style={styles.lightboxCounter}>{activePhotoIndex + 1} {t('common.of')} {photos.length}</Text>
                <TouchableOpacity style={styles.lightboxActionBtn} onPress={() => handleSetCoverPhoto(photos[activePhotoIndex])}>
                  <Star color={photos[activePhotoIndex].is_main ? COLORS.primary : '#FFF'} size={16} fill={photos[activePhotoIndex].is_main ? COLORS.primary : 'transparent'} />
                  <Text style={styles.lightboxActionText}>{photos[activePhotoIndex].is_main ? t('motorcycle.primaryBadge') : t('motorcycle.setPrimary')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.lightboxActionBtn} onPress={() => handleDeletePhoto(photos[activePhotoIndex])}>
                  <Trash2 color={COLORS.danger} size={16} />
                  <Text style={[styles.lightboxActionText, { color: COLORS.danger }]}>{t('common.delete')}</Text>
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
            <Text style={styles.modalTitle}>{t('motorcycle.uploadDocument')}</Text>
            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>{t('common.name').toUpperCase()} *</Text>
              <TextInput style={styles.modalInput} value={newDocTitle} onChangeText={setNewDocTitle} placeholder="e.g. Insurance Policy - ABC113" placeholderTextColor={COLORS.textMuted} />

              <Text style={styles.inputLabel}>{t('common.category').toUpperCase()}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
                {(['Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'] as DocumentType[]).map(tType => (
                  <TouchableOpacity key={tType} style={[styles.pill, newDocType === tType && styles.pillActive]} onPress={() => setNewDocType(tType)}>
                    <Text style={[styles.pillText, newDocType === tType && styles.pillTextActive]}>{tType}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>{t('motorcycle.expiryDate').toUpperCase()} ({t('common.optional').toUpperCase()} - YYYY-MM-DD)</Text>
              <TextInput style={styles.modalInput} value={newDocExpiryDate} onChangeText={setNewDocExpiryDate} placeholder="e.g. 2026-08-10" placeholderTextColor={COLORS.textMuted} />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowUploadDocModal(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <CustomButton title={uploadingDoc ? t('common.uploading').toUpperCase() : t('common.save').toUpperCase()} onPress={handleUploadDocumentSubmit} disabled={uploadingDoc} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT DOCUMENT MODAL */}
      <Modal visible={showEditDocModal} transparent animationType="fade" onRequestClose={() => setShowEditDocModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.modalTitle}>✏️ {t('motorcycle.editDocument')}</Text>
            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>{t('common.name').toUpperCase()} *</Text>
              <TextInput style={styles.modalInput} value={editDocTitle} onChangeText={setEditDocTitle} placeholder="Document Title" placeholderTextColor={COLORS.textMuted} />

              <Text style={styles.inputLabel}>{t('common.type').toUpperCase()}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
                {(['Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'] as DocumentType[]).map(tType => (
                  <TouchableOpacity key={tType} style={[styles.pill, editDocType === tType && styles.pillActive]} onPress={() => setEditDocType(tType)}>
                    <Text style={[styles.pillText, editDocType === tType && styles.pillTextActive]}>{tType}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>{t('motorcycle.expiryDate').toUpperCase()} (YYYY-MM-DD)</Text>
              <TextInput style={styles.modalInput} value={editDocExpiryDate} onChangeText={setEditDocExpiryDate} placeholder="e.g. 2026-08-10" placeholderTextColor={COLORS.textMuted} />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditDocModal(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <CustomButton title={savingEditDoc ? t('common.saving').toUpperCase() : t('common.saveChanges').toUpperCase()} onPress={handleSaveEditDocument} disabled={savingEditDoc} style={{ flex: 1 }} />
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
                <Text style={styles.modalTitle} numberOfLines={1}>{previewDoc?.title || t('motorcycle.viewDocument')}</Text>
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
                      <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '900' }}>{t('common.category').toUpperCase()}: {previewDoc.type.toUpperCase()}</Text>
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
                      {t('common.date')}: {new Date(previewDoc.created_at).toLocaleDateString()}
                    </Text>
                    {previewDoc.expiry_date && (
                      <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>
                        {t('motorcycle.expiryDate')}: {previewDoc.expiry_date}
                      </Text>
                    )}
                  </View>

                  {/* Document File Content Preview Box */}
                  <View style={{ height: 260, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', padding: 16 }}>
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
                            <FileText color={COLORS.primary} size={48} />
                            <Text style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: '800', textAlign: 'center' }}>{previewDoc.title}</Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 10, textAlign: 'center' }}>{previewDoc.file_path || ''}</Text>
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

            <View style={styles.modalBtnRow}>
              <CustomButton
                title={t('motorcycle.viewDocument').toUpperCase()}
                onPress={async () => {
                  if (previewSignedUrl) {
                    try {
                      await openDocument(previewSignedUrl);
                    } catch (err: any) {
                      Alert.alert(t('common.error'), err?.message || 'Unable to open document.');
                    }
                  }
                }}
                style={{ flex: 1 }}
              />
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDocPreviewVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('common.close')}</Text>
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
  docCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  docCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docCardTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  docCardSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  docCardExpiry: { color: COLORS.primary, fontSize: 10, fontWeight: '700', marginTop: 2 },
  docActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  viewDocBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryDark, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  viewDocBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
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
