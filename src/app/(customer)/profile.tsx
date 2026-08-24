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
  Alert,
  Switch,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  User, Bike, Plus, Upload, DollarSign, Settings, LogOut, Edit2,
  FileText, CheckCircle2, Shield, Lock, Trash2, Eye, Download,
  HelpCircle, MessageSquare, AlertTriangle, FileCode, Info, Globe,
  Bell, Moon, ChevronRight, Check, Award, RefreshCw, KeyRound, Camera, X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { getMotorcycles, updateMotorcycle, deleteMotorcycle } from '../../services/motorcycleService';
import { calculateHealthScore } from '../../services/maintenanceService';
import { getCustomerDocuments, createDocument, updateDocument, deleteDocument, uploadAndCreateDocument, validateDocumentFile } from '../../services/documentService';
import { updateProfile, resetPassword, updatePassword } from '../../services/authService';
import { PasswordInput } from '../../components/PasswordInput';
import type { Motorcycle, Document as RiderDoc, DocumentType } from '../../types/database';

export default function CustomerProfileScreen() {
  const router = useRouter();
  const { user, profile, logout, refreshProfile } = useAuth();
  const { t, language } = useTranslation();
  const { isPhone, contentPadding } = useResponsive();


  // Garage State
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [bikeHealthScores, setBikeHealthScores] = useState<Record<string, number>>({});
  const [loadingBikes, setLoadingBikes] = useState(true);

  // Documents State
  const [documents, setDocuments] = useState<RiderDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docFilter, setDocFilter] = useState<string>('All');
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('Insurance');
  const [newDocBikeId, setNewDocBikeId] = useState<string>('');
  const [newDocExpiryDate, setNewDocExpiryDate] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedNewDocFile, setSelectedNewDocFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  // Document Edit Modal State
  const [editingDoc, setEditingDoc] = useState<RiderDoc | null>(null);
  const [showEditDocModal, setShowEditDocModal] = useState(false);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocType, setEditDocType] = useState<DocumentType>('Insurance');
  const [editDocBikeId, setEditDocBikeId] = useState<string>('');
  const [editDocExpiryDate, setEditDocExpiryDate] = useState('');
  const [editDocFileName, setEditDocFileName] = useState<string | null>(null);
  const [savingEditDoc, setSavingEditDoc] = useState(false);

  // Personal Info Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('1995-08-20');
  const [address, setAddress] = useState('Kuala Lumpur, Malaysia');
  const [savingProfile, setSavingProfile] = useState(false);

  // Profile Picture Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);

  // Bike Edit & View Modal State
  const [selectedBike, setSelectedBike] = useState<Motorcycle | null>(null);
  const [showBikeViewModal, setShowBikeViewModal] = useState(false);
  const [showBikeEditModal, setShowBikeEditModal] = useState(false);
  const [editBikeNickname, setEditBikeNickname] = useState('');
  const [editBikeBrand, setEditBikeBrand] = useState('');
  const [editBikeModel, setEditBikeModel] = useState('');
  const [editBikeYear, setEditBikeYear] = useState('');
  const [editBikePlate, setEditBikePlate] = useState('');
  const [editBikeEngineCc, setEditBikeEngineCc] = useState('');
  const [editBikeFuelType, setEditBikeFuelType] = useState('');
  const [editBikeTransmission, setEditBikeTransmission] = useState('');
  const [editBikeEngineOil, setEditBikeEngineOil] = useState('');
  const [editBikeFrontTyre, setEditBikeFrontTyre] = useState('');
  const [editBikeRearTyre, setEditBikeRearTyre] = useState('');
  const [editBikeMileage, setEditBikeMileage] = useState('');
  const [editBikePhotoUrl, setEditBikePhotoUrl] = useState('');
  const [savingBike, setSavingBike] = useState(false);

  // Password / Security State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Settings State
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [useKm, setUseKm] = useState(true);
  const [privacyEnabled, setPrivacyEnabled] = useState(true);

  // Load Data
  const loadGarageAndDocs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const fetchedBikes = await getMotorcycles(user.id);
      setBikes(fetchedBikes);

      const scores: Record<string, number> = {};
      for (const b of fetchedBikes) {
        scores[b.id] = await calculateHealthScore(b.id);
      }
      setBikeHealthScores(scores);

      const docs = await getCustomerDocuments(user.id);
      setDocuments(docs);
    } catch (err) {
      console.log('Error loading profile data:', err);
    } finally {
      setLoadingBikes(false);
      setLoadingDocs(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadGarageAndDocs();
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
    }
  }, [loadGarageAndDocs, profile]);

  // ─── PROFILE PICTURE (AVATAR) EDITING ──────────────────────────
  const handlePickProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Options',
          'Gallery access was not granted. Choose a sample profile picture or enter a photo URL:',
          [
            {
              text: 'Avatar Sample 1',
              onPress: async () => {
                const url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';
                setAvatarUrl(url);
                if (user?.id) await updateProfile(user.id, { avatar_url: url });
                if (refreshProfile) refreshProfile();
                Alert.alert('Success', 'Profile picture updated.');
              },
            },
            {
              text: 'Avatar Sample 2',
              onPress: async () => {
                const url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';
                setAvatarUrl(url);
                if (user?.id) await updateProfile(user.id, { avatar_url: url });
                if (refreshProfile) refreshProfile();
                Alert.alert('Success', 'Profile picture updated.');
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setAvatarUrl(selectedUri);
        if (user?.id) {
          await updateProfile(user.id, { avatar_url: selectedUri });
          if (refreshProfile) refreshProfile();
        }
        Alert.alert('Success', 'Profile picture updated successfully.');
      }
    } catch (err: any) {
      console.error('Profile picture edit error:', err);
      Alert.alert('Error', err?.message || 'Failed to update profile picture.');
    }
  };

  // Handle Save Personal Info
  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      await updateProfile(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        avatar_url: avatarUrl || undefined,
      });
      setIsEditingProfile(false);
      if (refreshProfile) refreshProfile();
      Alert.alert('Success', 'Personal information updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Bike Actions
  const handleSetPrimaryBike = async (bikeId: string) => {
    try {
      Alert.alert('Primary Motorcycle', 'Set as primary motorcycle for quick booking & maintenance?');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update primary bike.');
    }
  };

  const handleDeleteBike = (bikeId: string, name: string) => {
    Alert.alert(
      'Delete Motorcycle?',
      `Are you sure you want to remove ${name} from your garage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMotorcycle(bikeId);
              setBikes(bikes.filter(b => b.id !== bikeId));
              Alert.alert('Deleted', 'Motorcycle removed from garage.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete motorcycle.');
            }
          },
        },
      ]
    );
  };

  const handleSaveBikeEdit = async () => {
    if (!selectedBike) return;
    if (!editBikeBrand.trim() || !editBikeModel.trim() || !editBikePlate.trim()) {
      Alert.alert('Incomplete Info', 'Brand, Model, and Plate Number are required.');
      return;
    }
    setSavingBike(true);
    try {
      const yr = parseInt(editBikeYear, 10) || selectedBike.year || new Date().getFullYear();
      const odo = parseInt(editBikeMileage, 10) || selectedBike.current_mileage;
      const cc = parseInt(editBikeEngineCc, 10) || null;

      await updateMotorcycle(selectedBike.id, {
        nickname: editBikeNickname.trim() || `${editBikeBrand} ${editBikeModel}`,
        brand: editBikeBrand.trim(),
        model: editBikeModel.trim(),
        year: yr,
        plate_number: editBikePlate.trim().toUpperCase(),
        engine_cc: cc,
        fuel_type: editBikeFuelType.trim() || null,
        transmission: editBikeTransmission.trim() || null,
        engine_oil_type: editBikeEngineOil.trim() || null,
        front_tyre_size: editBikeFrontTyre.trim() || null,
        rear_tyre_size: editBikeRearTyre.trim() || null,
        current_mileage: odo,
        photo_url: editBikePhotoUrl.trim() || null,
      });

      setShowBikeEditModal(false);
      await loadGarageAndDocs();
      Alert.alert('Saved', 'All motorcycle details updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update motorcycle.');
    } finally {
      setSavingBike(false);
    }
  };

  // ─── DOCUMENT ACTIONS & FULL DOCUMENT EDITING ─────────────────
  const handlePickNewDocFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSelectedNewDocFile(res.assets[0]);
      }
    } catch (err: any) {
      console.log('Profile doc picker error:', err);
    }
  };

  const handleUploadDocumentSubmit = async () => {
    if (!user?.id || !newDocTitle.trim()) {
      Alert.alert('Required', 'Please enter a document title.');
      return;
    }
    if (!selectedNewDocFile) {
      Alert.alert('Required', 'Please select a document file (PDF, JPG, PNG, WEBP).');
      return;
    }
    const valRes = validateDocumentFile(selectedNewDocFile);
    if (!valRes.valid) {
      Alert.alert('Invalid File', valRes.error || 'Please attach a valid PDF or image file.');
      return;
    }
    setUploadingDoc(true);
    try {
      const created = await uploadAndCreateDocument({
        customer_id: user.id,
        motorcycle_id: newDocBikeId || undefined,
        title: newDocTitle.trim(),
        type: newDocType,
        file: selectedNewDocFile,
        expiry_date: newDocExpiryDate && newDocExpiryDate.trim() ? newDocExpiryDate.trim() : null,
      });
      setDocuments([created, ...documents]);
      setNewDocTitle('');
      setNewDocExpiryDate('');
      setSelectedNewDocFile(null);
      setShowUploadDocModal(false);
      Alert.alert('Success', 'Document uploaded to Supabase Storage and saved to vault.');
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const openEditDocModal = (doc: RiderDoc) => {
    setEditingDoc(doc);
    setEditDocTitle(doc.title);
    setEditDocType(doc.type);
    setEditDocBikeId(doc.motorcycle_id || '');
    setEditDocExpiryDate(doc.expiry_date || '');
    setEditDocFileName(doc.file_path ? doc.file_path.split('/').pop() || null : null);
    setShowEditDocModal(true);
  };

  const handlePickEditDocumentFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setEditDocFileName(file.name);
      }
    } catch (err: any) {
      console.log('Error picking replacement file:', err);
    }
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
        motorcycle_id: editDocBikeId || null,
        expiry_date: editDocExpiryDate && editDocExpiryDate.trim() ? editDocExpiryDate.trim() : null,
      });

      setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
      setShowEditDocModal(false);
      Alert.alert('Success', 'Document details updated successfully.');
    } catch (err: any) {
      Alert.alert('Update Error', err?.message || 'Failed to update document.');
    } finally {
      setSavingEditDoc(false);
    }
  };

  const handleDeleteDocument = (docId: string, title: string) => {
    Alert.alert('Delete Document', `Are you sure you want to remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(docId);
            setDocuments(documents.filter(d => d.id !== docId));
            Alert.alert('Deleted', `"${title}" has been deleted.`);
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete document.');
          }
        },
      },
    ]);
  };

  // Handle Change Password
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setUpdatingPassword(true);
    try {
      await updatePassword(newPassword);
      setShowChangePasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      Alert.alert('Reset Link Sent', `Password reset instructions sent to ${user.email}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send reset email.');
    }
  };

  const filteredDocs = docFilter === 'All'
    ? documents
    : documents.filter(d => d.type === docFilter);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Rider Profile" subtitle="Garage, Personal Info, Documents & Security" />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding }]} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          {/* ================= 1. PROFILE HEADER ================= */}
          <View style={styles.profileHeaderCard}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickProfilePicture} activeOpacity={0.8}>
            {avatarUrl || profile?.avatar_url ? (
              <Image source={{ uri: (avatarUrl || profile?.avatar_url)! }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarCircle}>
                <User color={COLORS.primary} size={36} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Camera color="#FFFFFF" size={14} />
            </View>
          </TouchableOpacity>

          <Text style={styles.profileHeaderName}>{profile?.full_name || 'Rider'}</Text>
          <Text style={styles.profileHeaderEmail}>{profile?.email || user?.email}</Text>
          {profile?.phone ? <Text style={styles.profileHeaderPhone}>📞 {profile.phone}</Text> : null}

          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active Rider Account</Text>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => setIsEditingProfile(!isEditingProfile)}
            activeOpacity={0.8}
          >
            <Edit2 color={COLORS.primary} size={14} />
            <Text style={styles.editProfileBtnText}>{isEditingProfile ? 'Close Edit Form' : 'Edit Profile'}</Text>
          </TouchableOpacity>
        </View>

        {/* ================= 2. PERSONAL INFORMATION ================= */}
        {isEditingProfile ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>EDIT PERSONAL INFORMATION</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME *</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t('auth.fullNamePlaceholder')}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.emailAddress').toUpperCase()}</Text>
              <TextInput
                style={[styles.input, { opacity: 0.6 }]}
                value={profile?.email || ''}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.phone').toUpperCase()}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('auth.phonePlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('motorcycle.photoUrl').toUpperCase()}</Text>
              <TextInput
                style={styles.input}
                value={avatarUrl || ''}
                onChangeText={setAvatarUrl}
                placeholder="https://..."
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <CustomButton
              title={savingProfile ? t('common.submitting').toUpperCase() : t('common.save').toUpperCase()}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('profile.personalInfo').toUpperCase()}</Text>

            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('auth.fullName')}</Text>
                <Text style={styles.infoValue}>{profile?.full_name || '-'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('auth.emailAddress')}</Text>
                <Text style={styles.infoValue}>{profile?.email || user?.email}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('auth.phone')}</Text>
                <Text style={styles.infoValue}>{profile?.phone || '-'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('workshop.address')}</Text>
                <Text style={styles.infoValue}>{address}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ================= 3. MY MOTORCYCLE GARAGE ================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('motorcycle.garage').toUpperCase()} ({bikes.length})</Text>
          <TouchableOpacity
            style={styles.addBikeBtn}
            onPress={() => router.push('/(customer)/setup-motorcycle')}
          >
            <Plus color={COLORS.primary} size={14} />
            <Text style={styles.addBikeText}>+ {t('motorcycle.addFirstBike')}</Text>
          </TouchableOpacity>
        </View>

        {loadingBikes ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
        ) : bikes.length === 0 ? (
          <View style={styles.emptyGarageCard}>
            <Bike color={COLORS.textMuted} size={32} />
            <Text style={styles.emptyGarageTitle}>{t('motorcycle.noBikesRegistered')}</Text>
            <Text style={styles.emptyGarageSub}>{t('motorcycle.noBikesDesc')}</Text>
          </View>
        ) : (
          bikes.map((bike, index) => {
            const isPrimary = index === 0;
            const healthScore = bikeHealthScores[bike.id] ?? 90;
            const healthStatus = healthScore >= 80 ? t('motorcycle.healthGood') : t('motorcycle.serviceDue');

            return (
              <View key={bike.id} style={styles.garageCard}>
                <View style={styles.garageHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.bikeName}>🏍️ {bike.nickname || `${bike.brand} ${bike.model}`}</Text>
                      {isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>{t('motorcycle.primaryBadge').toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.bikeSub}>{bike.brand} {bike.model} • {bike.year || '2024'}</Text>
                  </View>
                </View>

                <View style={styles.garageSpecsGrid}>
                  <View style={styles.garageSpecItem}>
                    <Text style={styles.garageSpecLabel}>{t('motorcycle.plateNumber').toUpperCase()}</Text>
                    <Text style={styles.garageSpecVal}>{bike.plate_number}</Text>
                  </View>
                  <View style={styles.garageSpecItem}>
                    <Text style={styles.garageSpecLabel}>{t('motorcycle.currentOdometer').toUpperCase()}</Text>
                    <Text style={styles.garageSpecVal}>{bike.current_mileage.toLocaleString()} km</Text>
                  </View>
                  <View style={styles.garageSpecItem}>
                    <Text style={styles.garageSpecLabel}>{t('motorcycle.healthScore').toUpperCase()}</Text>
                    <Text style={[styles.garageSpecVal, { color: healthScore >= 80 ? COLORS.success : '#f59e0b' }]}>
                      {healthStatus} ({healthScore}%)
                    </Text>
                  </View>
                </View>

                <View style={styles.garageActionsRow}>
                  <TouchableOpacity
                    style={styles.garageActionBtn}
                    onPress={() => router.push(`/(customer)/motorcycle/${bike.id}` as any)}
                  >
                    <Eye color={COLORS.textPrimary} size={14} />
                    <Text style={styles.garageActionText}>{t('common.view')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.garageActionBtn, { borderColor: COLORS.dangerBg }]}
                    onPress={() => handleDeleteBike(bike.id, bike.nickname || bike.model)}
                  >
                    <Trash2 color={COLORS.danger} size={14} />
                    <Text style={[styles.garageActionText, { color: COLORS.danger }]}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* ================= 4. ACCOUNT & SECURITY ================= */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('navigation.security').toUpperCase()}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowChangePasswordModal(true)}
          >
            <Lock color={COLORS.primary} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>{t('security.changePassword')}</Text>
              <Text style={styles.menuRowSub}>{t('security.changePasswordDesc')}</Text>
            </View>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Alert.alert(t('security.activeSessions'), t('security.activeSessionsDesc'))}
          >
            <Shield color={COLORS.primary} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>{t('security.activeSessions')}</Text>
              <Text style={styles.menuRowSub}>{t('security.activeSessionsDesc')}</Text>
            </View>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>
        </View>

        {/* ================= 6. APP SETTINGS & PREFERENCES ================= */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('settings.subtitle').toUpperCase()}</Text>
        
        {/* Universal Language Selector */}
        <View style={{ marginBottom: 12 }}>
          <LanguageSelector variant="card" />
        </View>

        <View style={styles.card}>
          <View style={styles.menuRow}>
            <Bell color={COLORS.primary} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>{t('settings.notifications')}</Text>
              <Text style={styles.menuRowSub}>{t('dashboard.serviceReminderDesc')}</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
              thumbColor={notifications ? COLORS.primary : '#888'}
            />
          </View>
        </View>

        {/* ================= 7. HELP & SUPPORT ================= */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('navigation.help').toUpperCase()}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(customer)/help')}
          >
            <HelpCircle color={COLORS.primary} size={18} />
            <Text style={styles.menuRowTitleFlex}>{t('help.faqTitle')}</Text>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(customer)/help')}
          >
            <MessageSquare color={COLORS.primary} size={18} />
            <Text style={styles.menuRowTitleFlex}>{t('help.contactSupport')}</Text>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(customer)/help')}
          >
            <AlertTriangle color={COLORS.primary} size={18} />
            <Text style={styles.menuRowTitleFlex}>{t('help.reportIssue')}</Text>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(customer)/help')}
          >
            <Info color={COLORS.primary} size={18} />
            <Text style={styles.menuRowTitleFlex}>{t('help.aboutRiderHood')}</Text>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <LogOut color={COLORS.danger} size={18} />
          <Text style={styles.logoutBtnText}>{t('common.logout')}</Text>
        </TouchableOpacity>
        </ResponsiveContainer>
      </ScrollView>

      {/* Modal: View Motorcycle Details */}
      <Modal visible={showBikeViewModal} transparent animationType="fade" onRequestClose={() => setShowBikeViewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Bike color={COLORS.primary} size={24} />
              <Text style={styles.modalTitle}>🏍️ {selectedBike?.nickname || `${selectedBike?.brand} ${selectedBike?.model}`}</Text>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.specsGrid}>
                <View style={styles.specBox}>
                  <Text style={styles.specBoxLabel}>{t('motorcycle.brand').toUpperCase()}</Text>
                  <Text style={styles.specBoxVal}>{selectedBike?.brand}</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specBoxLabel}>{t('motorcycle.model').toUpperCase()}</Text>
                  <Text style={styles.specBoxVal}>{selectedBike?.model}</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specBoxLabel}>{t('motorcycle.year').toUpperCase()}</Text>
                  <Text style={styles.specBoxVal}>{selectedBike?.year || '2024'}</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specBoxLabel}>{t('motorcycle.plateNumber').toUpperCase()}</Text>
                  <Text style={styles.specBoxVal}>{selectedBike?.plate_number}</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specBoxLabel}>{t('motorcycle.engineCapacity').toUpperCase()}</Text>
                  <Text style={styles.specBoxVal}>{selectedBike?.engine_cc ? `${selectedBike.engine_cc} cc` : 'N/A'}</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specBoxLabel}>{t('motorcycle.fuelType').toUpperCase()} / {t('motorcycle.transmission').toUpperCase()}</Text>
                  <Text style={styles.specBoxVal}>{selectedBike?.fuel_type || 'Petrol'} • {selectedBike?.transmission || 'Manual'}</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specBoxLabel}>{t('motorcycle.engineOil').toUpperCase()}</Text>
                  <Text style={styles.specBoxVal}>{selectedBike?.engine_oil_type || '10W-40'}</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specBoxLabel}>{t('motorcycle.tyreSize').toUpperCase()}</Text>
                  <Text style={styles.specBoxVal}>{selectedBike?.front_tyre_size || '90/80-17'} / {selectedBike?.rear_tyre_size || '120/70-17'}</Text>
                </View>
                <View style={[styles.specBox, { width: '100%' }]}>
                  <Text style={styles.specBoxLabel}>{t('motorcycle.currentOdometer').toUpperCase()}</Text>
                  <Text style={[styles.specBoxVal, { color: COLORS.primary, fontSize: 18 }]}>
                    {selectedBike?.current_mileage.toLocaleString()} km
                  </Text>
                </View>
              </View>
            </ScrollView>

            <CustomButton title={t('common.close').toUpperCase()} variant="secondary" onPress={() => setShowBikeViewModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Modal: Edit Motorcycle Details */}
      <Modal visible={showBikeEditModal} transparent animationType="fade" onRequestClose={() => setShowBikeEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ Edit Motorcycle Details</Text>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>MOTORCYCLE NICKNAME</Text>
                  <TextInput
                    style={styles.input}
                    value={editBikeNickname}
                    onChangeText={setEditBikeNickname}
                    placeholder="e.g. Ahxia or My Beast"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>BRAND *</Text>
                    <TextInput
                      style={styles.input}
                      value={editBikeBrand}
                      onChangeText={setEditBikeBrand}
                      placeholder="e.g. Perodua"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>MODEL *</Text>
                    <TextInput
                      style={styles.input}
                      value={editBikeModel}
                      onChangeText={setEditBikeModel}
                      placeholder="e.g. Axia"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>YEAR</Text>
                    <TextInput
                      style={styles.input}
                      value={editBikeYear}
                      onChangeText={setEditBikeYear}
                      placeholder="e.g. 2016"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>PLATE NUMBER *</Text>
                    <TextInput
                      style={styles.input}
                      value={editBikePlate}
                      onChangeText={setEditBikePlate}
                      placeholder="e.g. ABC 113"
                      placeholderTextColor={COLORS.textMuted}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>ENGINE CC</Text>
                    <TextInput
                      style={styles.input}
                      value={editBikeEngineCc}
                      onChangeText={setEditBikeEngineCc}
                      placeholder="e.g. 1000"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>UPDATE MILEAGE (KM)</Text>
                    <TextInput
                      style={styles.input}
                      value={editBikeMileage}
                      onChangeText={setEditBikeMileage}
                      placeholder="e.g. 2000"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>FUEL TYPE</Text>
                    <TextInput
                      style={styles.input}
                      value={editBikeFuelType}
                      onChangeText={setEditBikeFuelType}
                      placeholder="e.g. Petrol"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>TRANSMISSION</Text>
                    <TextInput
                      style={styles.input}
                      value={editBikeTransmission}
                      onChangeText={setEditBikeTransmission}
                      placeholder="e.g. Automatic"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ENGINE OIL GRADE</Text>
                  <TextInput
                    style={styles.input}
                    value={editBikeEngineOil}
                    onChangeText={setEditBikeEngineOil}
                    placeholder="e.g. Fully Synthetic 10W-40"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>FRONT TYRE</Text>
                    <TextInput
                      style={styles.input}
                      value={editBikeFrontTyre}
                      onChangeText={setEditBikeFrontTyre}
                      placeholder="e.g. 90/80-17"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>REAR TYRE</Text>
                    <TextInput
                      style={styles.input}
                      value={editBikeRearTyre}
                      onChangeText={setEditBikeRearTyre}
                      placeholder="e.g. 120/70-17"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>COVER PHOTO URL</Text>
                  <TextInput
                    style={styles.input}
                    value={editBikePhotoUrl}
                    onChangeText={setEditBikePhotoUrl}
                    placeholder="https://..."
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={{ marginTop: 12, gap: 8 }}>
              <CustomButton
                title={savingBike ? 'SAVING...' : 'SAVE CHANGES'}
                onPress={handleSaveBikeEdit}
                disabled={savingBike}
              />
              <CustomButton title="CANCEL" variant="secondary" onPress={() => setShowBikeEditModal(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Upload Document */}
      <Modal visible={showUploadDocModal} transparent animationType="fade" onRequestClose={() => setShowUploadDocModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload Motorcycle Document</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DOCUMENT TITLE *</Text>
              <TextInput
                style={styles.input}
                value={newDocTitle}
                onChangeText={setNewDocTitle}
                placeholder="e.g. Insurance Renewal Policy 2026"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DOCUMENT TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 4 }}>
                {(['Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'] as DocumentType[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, newDocType === t && styles.typeChipActive]}
                    onPress={() => setNewDocType(t)}
                  >
                    <Text style={[styles.typeChipText, newDocType === t && styles.typeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EXPIRY DATE (OPTIONAL - YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={newDocExpiryDate}
                onChangeText={setNewDocExpiryDate}
                placeholder="e.g. 2026-08-10"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <CustomButton
              title={uploadingDoc ? 'UPLOADING...' : 'SAVE DOCUMENT'}
              onPress={handleUploadDocumentSubmit}
              disabled={uploadingDoc}
            />
            <CustomButton title="CANCEL" variant="secondary" onPress={() => setShowUploadDocModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Modal: Edit Document */}
      <Modal visible={showEditDocModal} transparent animationType="fade" onRequestClose={() => setShowEditDocModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <FileText color={COLORS.primary} size={22} />
              <Text style={styles.modalTitle}>✏️ Edit Document Details</Text>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>DOCUMENT TITLE *</Text>
                  <TextInput
                    style={styles.input}
                    value={editDocTitle}
                    onChangeText={setEditDocTitle}
                    placeholder="Document Title"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>DOCUMENT TYPE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 4 }}>
                    {(['Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'] as DocumentType[]).map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeChip, editDocType === t && styles.typeChipActive]}
                        onPress={() => setEditDocType(t)}
                      >
                        <Text style={[styles.typeChipText, editDocType === t && styles.typeChipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EXPIRY DATE (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={editDocExpiryDate}
                    onChangeText={setEditDocExpiryDate}
                    placeholder="e.g. 2026-08-10"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ATTACHED FILE</Text>
                  <TouchableOpacity
                    style={styles.filePickerBtn}
                    onPress={handlePickEditDocumentFile}
                  >
                    <Upload color={COLORS.primary} size={16} />
                    <Text style={styles.filePickerBtnText}>
                      {editDocFileName ? `📄 ${editDocFileName}` : 'Choose New Document File'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={{ marginTop: 12, gap: 8 }}>
              <CustomButton
                title={savingEditDoc ? 'SAVING...' : 'SAVE DOCUMENT CHANGES'}
                onPress={handleSaveEditDocument}
                disabled={savingEditDoc}
              />
              <CustomButton title="CANCEL" variant="secondary" onPress={() => setShowEditDocModal(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Change Password */}
      <Modal visible={showChangePasswordModal} transparent animationType="fade" onRequestClose={() => setShowChangePasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Account Password</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <PasswordInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimum 6 characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
              <PasswordInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
              />
            </View>

            <CustomButton
              title={updatingPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}
              onPress={handleChangePassword}
              disabled={updatingPassword}
            />

            <TouchableOpacity style={{ marginTop: 8, alignItems: 'center' }} onPress={handleForgotPassword}>
              <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Forgot password? Send reset link to email</Text>
            </TouchableOpacity>

            <CustomButton title="CANCEL" variant="secondary" onPress={() => setShowChangePasswordModal(false)} style={{ marginTop: 8 }} />
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
    paddingTop: 24,
    paddingBottom: 60,
    gap: 20,
  },
  profileHeaderCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surfaceContainer,
  },
  profileHeaderName: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  profileHeaderEmail: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  profileHeaderPhone: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  statusText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '800',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editProfileBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
    marginBottom: 24,
  },
  cardTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  addBikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBikeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyGarageCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    marginBottom: 24,
  },
  emptyGarageTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyGarageSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  garageCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
    marginBottom: 16,
  },
  garageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bikeName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  primaryBadge: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  primaryBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  bikeSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  garageSpecsGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  garageSpecItem: {
    flex: 1,
  },
  garageSpecLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  garageSpecVal: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  garageActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  garageActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  garageActionText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  filterPillsRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainer,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  pillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  emptyDocsCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyDocsTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyDocsSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  docItemTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  docItemMeta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  docBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  docActionIconBtn: {
    padding: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  menuRowTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  menuRowTitleFlex: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  menuRowSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  langToggleBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  langToggleText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerBg,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginTop: 12,
    marginBottom: 36,
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specBox: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  specBoxLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  specBoxVal: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  typeChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  typeChipTextActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  filePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
  },
  filePickerBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});
