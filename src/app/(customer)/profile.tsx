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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  User, Bike, Plus, Upload, DollarSign, Settings, LogOut, Edit2,
  FileText, CheckCircle2, Shield, Lock, Trash2, Eye, Download,
  HelpCircle, MessageSquare, AlertTriangle, FileCode, Info, Globe,
  Bell, Moon, ChevronRight, Check, Award, RefreshCw, KeyRound,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getMotorcycles, updateMotorcycle, deleteMotorcycle } from '../../services/motorcycleService';
import { calculateHealthScore } from '../../services/maintenanceService';
import { getCustomerDocuments, createDocument, deleteDocument } from '../../services/documentService';
import { updateProfile, resetPassword } from '../../services/authService';
import { PasswordInput } from '../../components/PasswordInput';
import { updatePassword } from '../../services/authService';
import type { Motorcycle, Document as RiderDoc } from '../../types/database';

export default function CustomerProfileScreen() {
  const router = useRouter();
  const { user, profile, logout, refreshProfile } = useAuth();

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
  const [newDocType, setNewDocType] = useState<any>('Insurance');
  const [newDocBikeId, setNewDocBikeId] = useState<string>('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Personal Info Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('1995-08-20');
  const [address, setAddress] = useState('Kuala Lumpur, Malaysia');
  const [savingProfile, setSavingProfile] = useState(false);

  // Bike Edit & View Modal State
  const [selectedBike, setSelectedBike] = useState<Motorcycle | null>(null);
  const [showBikeViewModal, setShowBikeViewModal] = useState(false);
  const [showBikeEditModal, setShowBikeEditModal] = useState(false);
  const [editBikeMileage, setEditBikeMileage] = useState('');
  const [editBikeNickname, setEditBikeNickname] = useState('');
  const [savingBike, setSavingBike] = useState(false);

  // Password / Security State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Settings State
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState<'EN' | 'BM'>('EN');
  const [darkMode, setDarkMode] = useState(true);
  const [useKm, setUseKm] = useState(true);
  const [privacyEnabled, setPrivacyEnabled] = useState(true);

  // Load Data
  const loadGarageAndDocs = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Load motorcycles
      const fetchedBikes = await getMotorcycles(user.id);
      setBikes(fetchedBikes);

      // Compute health score for each bike
      const scores: Record<string, number> = {};
      for (const b of fetchedBikes) {
        scores[b.id] = await calculateHealthScore(b.id);
      }
      setBikeHealthScores(scores);

      // Load documents
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
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
    loadGarageAndDocs();
  }, [profile, loadGarageAndDocs]);

  // Handle Save Personal Profile
  const handleSaveProfile = async () => {
    if (!user?.id) return;
    if (!fullName.trim()) {
      Alert.alert('Required', 'Full Name cannot be empty.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      });
      await refreshProfile();
      setIsEditingProfile(false);
      Alert.alert('Success', 'Personal profile details updated.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update personal profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Motorcycle Actions
  const handleSetPrimaryBike = async (bikeId: string) => {
    try {
      const bikeToSet = bikes.find(b => b.id === bikeId);
      if (!bikeToSet) return;
      Alert.alert('Primary Vehicle Set', `${bikeToSet.nickname || bikeToSet.model} is now set as your primary motorcycle.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to set primary bike.');
    }
  };

  const handleDeleteBike = (bikeId: string, name: string) => {
    Alert.alert(
      'Delete Motorcycle',
      `Are you sure you want to remove ${name} from your garage? This will delete all associated logs.`,
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
    setSavingBike(true);
    try {
      const updatedOdo = parseInt(editBikeMileage, 10) || selectedBike.current_mileage;
      await updateMotorcycle(selectedBike.id, {
        nickname: editBikeNickname.trim() || selectedBike.nickname,
        current_mileage: updatedOdo,
      });
      setShowBikeEditModal(false);
      await loadGarageAndDocs();
      Alert.alert('Saved', 'Motorcycle details updated.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update motorcycle.');
    } finally {
      setSavingBike(false);
    }
  };

  // Handle Document Actions
  const handleUploadDocumentSubmit = async () => {
    if (!user?.id || !newDocTitle.trim()) {
      Alert.alert('Required', 'Please enter a document title.');
      return;
    }
    setUploadingDoc(true);
    try {
      const created = await createDocument({
        customer_id: user.id,
        motorcycle_id: newDocBikeId || undefined,
        title: newDocTitle.trim(),
        type: newDocType,
        file_path: `documents/${user.id}/${Date.now()}_${newDocTitle.replace(/\s+/g, '_')}.pdf`,
        file_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop',
      });
      setDocuments([created, ...documents]);
      setNewDocTitle('');
      setShowUploadDocModal(false);
      Alert.alert('Success', 'Document saved to profile.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save document.');
    } finally {
      setUploadingDoc(false);
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ================= 1. PROFILE HEADER ================= */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <User color={COLORS.primary} size={36} />
          </View>
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
                placeholder="Full Name"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS (READ-ONLY)</Text>
              <TextInput
                style={[styles.input, { opacity: 0.6 }]}
                value={profile?.email || ''}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+60 12-345 6789"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>DATE OF BIRTH</Text>
                <TextInput
                  style={styles.input}
                  value={dob}
                  onChangeText={setDob}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>LOCATION / CITY</Text>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Kuala Lumpur"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditingProfile(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <CustomButton
                title={savingProfile ? 'SAVING...' : 'SAVE CHANGES'}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <User color={COLORS.primary} size={18} />
              <Text style={styles.cardTitle}>PERSONAL INFORMATION</Text>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoVal}>{profile?.full_name || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoVal}>{profile?.email || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoVal}>{profile?.phone || 'Not provided'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoVal}>{address}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ================= 3. MY MOTORCYCLE GARAGE 🏍️ ================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MY MOTORCYCLE GARAGE ({bikes.length})</Text>
          <TouchableOpacity
            style={styles.addBikeBtn}
            onPress={() => router.push('/(customer)/setup-motorcycle')}
            activeOpacity={0.8}
          >
            <Plus color={COLORS.primary} size={14} />
            <Text style={styles.addBikeText}>+ Register New Motorcycle</Text>
          </TouchableOpacity>
        </View>

        {loadingBikes ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
        ) : bikes.length === 0 ? (
          <View style={styles.emptyGarageCard}>
            <Bike color={COLORS.textMuted} size={40} />
            <Text style={styles.emptyGarageTitle}>MY GARAGE IS EMPTY</Text>
            <Text style={styles.emptyGarageDesc}>Register your motorcycle to track service reminders, health scores & maintenance receipts.</Text>
            <CustomButton
              title="+ Register New Motorcycle"
              onPress={() => router.push('/(customer)/setup-motorcycle')}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          bikes.map((bike, idx) => {
            const healthScore = bikeHealthScores[bike.id] ?? 95;
            const healthStatus = healthScore >= 80 ? 'Good' : healthScore >= 60 ? 'Attention Needed' : 'Service Due';
            const isPrimary = idx === 0;

            return (
              <View key={bike.id} style={styles.garageCard}>
                <View style={styles.garageTopRow}>
                  <View style={styles.bikeIconBadge}>
                    <Bike color={COLORS.primary} size={24} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.bikeTitle}>🏍️ {bike.nickname || `${bike.brand} ${bike.model}`}</Text>
                      {isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.bikeMeta}>{bike.brand} {bike.model} • {bike.year}</Text>
                  </View>
                </View>

                <View style={styles.garageDetailsGrid}>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>PLATE NUMBER</Text>
                    <Text style={styles.detailVal}>{bike.plate_number}</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>CURRENT MILEAGE</Text>
                    <Text style={styles.detailVal}>{bike.current_mileage.toLocaleString()} km</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>HEALTH STATUS</Text>
                    <Text style={[styles.detailVal, { color: healthScore >= 80 ? COLORS.success : '#f59e0b' }]}>
                      {healthStatus} ({healthScore}%)
                    </Text>
                  </View>
                </View>

                <View style={styles.garageActionsRow}>
                  <TouchableOpacity
                    style={styles.garageActionBtn}
                    onPress={() => {
                      setSelectedBike(bike);
                      setShowBikeViewModal(true);
                    }}
                  >
                    <Eye color={COLORS.textPrimary} size={14} />
                    <Text style={styles.garageActionText}>View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.garageActionBtn}
                    onPress={() => {
                      setSelectedBike(bike);
                      setEditBikeNickname(bike.nickname || '');
                      setEditBikeMileage(bike.current_mileage.toString());
                      setShowBikeEditModal(true);
                    }}
                  >
                    <Edit2 color={COLORS.textPrimary} size={14} />
                    <Text style={styles.garageActionText}>Edit</Text>
                  </TouchableOpacity>

                  {!isPrimary && (
                    <TouchableOpacity
                      style={styles.garageActionBtn}
                      onPress={() => handleSetPrimaryBike(bike.id)}
                    >
                      <Check color={COLORS.primary} size={14} />
                      <Text style={[styles.garageActionText, { color: COLORS.primary }]}>Set Primary</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.garageActionBtn, { borderColor: COLORS.dangerBg }]}
                    onPress={() => handleDeleteBike(bike.id, bike.nickname || bike.model)}
                  >
                    <Trash2 color={COLORS.danger} size={14} />
                    <Text style={[styles.garageActionText, { color: COLORS.danger }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* ================= 4. DOCUMENTS SECTION ================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MOTORCYCLE DOCUMENTS ({documents.length})</Text>
          <TouchableOpacity
            style={styles.addBikeBtn}
            onPress={() => setShowUploadDocModal(true)}
          >
            <Upload color={COLORS.primary} size={14} />
            <Text style={styles.addBikeText}>+ Upload Document</Text>
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

        {loadingDocs ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
        ) : filteredDocs.length === 0 ? (
          <View style={styles.emptyDocsCard}>
            <FileText color={COLORS.textMuted} size={32} />
            <Text style={styles.emptyDocsTitle}>No {docFilter !== 'All' ? docFilter : ''} Documents Uploaded</Text>
            <Text style={styles.emptyDocsSub}>Keep your digital road tax, insurance policies, and service receipts in one secure vault.</Text>
          </View>
        ) : (
          filteredDocs.map((doc) => (
            <View key={doc.id} style={styles.docItemCard}>
              <FileText color={COLORS.primary} size={20} />
              <View style={{ flex: 1 }}>
                <Text style={styles.docItemTitle}>{doc.title}</Text>
                <Text style={styles.docItemMeta}>
                  {doc.type} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                  {doc.expiry_date ? ` • Expires ${doc.expiry_date}` : ''}
                </Text>
              </View>
              <View style={styles.docBtnGroup}>
                <TouchableOpacity
                  style={styles.docActionIconBtn}
                  onPress={() => Alert.alert('Viewing Document', `Opening ${doc.title}...`)}
                >
                  <Eye color={COLORS.textSecondary} size={16} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.docActionIconBtn}
                  onPress={() => Alert.alert('Downloading Document', `Downloaded ${doc.title} to storage.`)}
                >
                  <Download color={COLORS.primary} size={16} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.docActionIconBtn}
                  onPress={() => handleDeleteDocument(doc.id, doc.title)}
                >
                  <Trash2 color={COLORS.danger} size={16} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* ================= 5. ACCOUNT & SECURITY ================= */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ACCOUNT & SECURITY</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowChangePasswordModal(true)}
          >
            <Lock color={COLORS.primary} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Change Password</Text>
              <Text style={styles.menuRowSub}>Update your account security password</Text>
            </View>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow} onPress={handleForgotPassword}>
            <KeyRound color={COLORS.primary} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Reset Password via Email</Text>
              <Text style={styles.menuRowSub}>Send password reset instructions to {user?.email}</Text>
            </View>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.menuRow}>
            <Shield color={COLORS.primary} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Active Login Sessions</Text>
              <Text style={styles.menuRowSub}>Currently logged in on Expo Mobile Client (Active Session)</Text>
            </View>
            <CheckCircle2 color={COLORS.success} size={16} />
          </View>
        </View>

        {/* ================= 6. APP SETTINGS ================= */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>APP SETTINGS & PREFERENCES</Text>
        <View style={styles.card}>
          <View style={styles.settingSwitchRow}>
            <Bell color={COLORS.primary} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingSub}>Maintenance reminders & service updates</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#374151', true: COLORS.primaryDark }}
              thumbColor={notifications ? COLORS.primary : '#9ca3af'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingSwitchRow}>
            <Moon color={COLORS.primary} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Cyber Dark Theme</Text>
              <Text style={styles.settingSub}>High contrast theme for OLED displays</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#374151', true: COLORS.primaryDark }}
              thumbColor={darkMode ? COLORS.primary : '#9ca3af'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingSwitchRow}>
            <Globe color={COLORS.primary} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Distance Unit</Text>
              <Text style={styles.settingSub}>{useKm ? 'Kilometers (km)' : 'Miles (mi)'}</Text>
            </View>
            <Switch
              value={useKm}
              onValueChange={setUseKm}
              trackColor={{ false: '#374151', true: COLORS.primaryDark }}
              thumbColor={useKm ? COLORS.primary : '#9ca3af'}
            />
          </View>
        </View>

        {/* ================= 7. HELP & SUPPORT ================= */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>HELP & SUPPORT</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Alert.alert('Help Centre', 'RiderHood Help Center & FAQ guide is active.')}
          >
            <HelpCircle color={COLORS.primary} size={18} />
            <Text style={styles.menuRowTitleFlex}>Help Centre & FAQs</Text>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Alert.alert('Contact Support', 'Email us at support@riderhood.app or WhatsApp +60123456789')}
          >
            <MessageSquare color={COLORS.primary} size={18} />
            <Text style={styles.menuRowTitleFlex}>Contact Customer Support</Text>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Alert.alert('Report Problem', 'Thank you for reporting. Technical support team has been alerted.')}
          >
            <AlertTriangle color={COLORS.primary} size={18} />
            <Text style={styles.menuRowTitleFlex}>Report a Problem</Text>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Alert.alert('Terms & Privacy', 'RiderHood v2.4.0 — All Terms & Privacy Policies apply.')}
          >
            <Info color={COLORS.primary} size={18} />
            <Text style={styles.menuRowTitleFlex}>About RiderHood (v2.4.0)</Text>
            <ChevronRight color={COLORS.textMuted} size={18} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <LogOut color={COLORS.danger} size={18} />
          <Text style={styles.logoutBtnText}>Logout Customer Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal: View Motorcycle Details */}
      <Modal visible={showBikeViewModal} transparent animationType="fade" onRequestClose={() => setShowBikeViewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Bike color={COLORS.primary} size={24} />
              <Text style={styles.modalTitle}>🏍️ {selectedBike?.nickname || `${selectedBike?.brand} ${selectedBike?.model}`}</Text>
            </View>

            <View style={styles.specsGrid}>
              <View style={styles.specBox}>
                <Text style={styles.specBoxLabel}>BRAND</Text>
                <Text style={styles.specBoxVal}>{selectedBike?.brand}</Text>
              </View>
              <View style={styles.specBox}>
                <Text style={styles.specBoxLabel}>MODEL</Text>
                <Text style={styles.specBoxVal}>{selectedBike?.model}</Text>
              </View>
              <View style={styles.specBox}>
                <Text style={styles.specBoxLabel}>YEAR</Text>
                <Text style={styles.specBoxVal}>{selectedBike?.year}</Text>
              </View>
              <View style={styles.specBox}>
                <Text style={styles.specBoxLabel}>PLATE</Text>
                <Text style={styles.specBoxVal}>{selectedBike?.plate_number}</Text>
              </View>
              <View style={[styles.specBox, { width: '100%' }]}>
                <Text style={styles.specBoxLabel}>CURRENT ODOMETER</Text>
                <Text style={[styles.specBoxVal, { color: COLORS.primary, fontSize: 18 }]}>
                  {selectedBike?.current_mileage.toLocaleString()} km
                </Text>
              </View>
            </View>

            <CustomButton title="CLOSE" variant="secondary" onPress={() => setShowBikeViewModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Modal: Edit Motorcycle Details */}
      <Modal visible={showBikeEditModal} transparent animationType="fade" onRequestClose={() => setShowBikeEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Motorcycle Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MOTORCYCLE NICKNAME</Text>
              <TextInput
                style={styles.input}
                value={editBikeNickname}
                onChangeText={setEditBikeNickname}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>UPDATE MILEAGE (KM)</Text>
              <TextInput
                style={styles.input}
                value={editBikeMileage}
                onChangeText={setEditBikeMileage}
                keyboardType="number-pad"
              />
            </View>

            <CustomButton
              title={savingBike ? 'SAVING...' : 'SAVE CHANGES'}
              onPress={handleSaveBikeEdit}
              disabled={savingBike}
            />
            <CustomButton title="CANCEL" variant="secondary" onPress={() => setShowBikeEditModal(false)} />
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

            <Text style={styles.inputLabel}>DOCUMENT CATEGORY</Text>
            <View style={styles.chipsRow}>
              {['Insurance', 'Road Tax', 'Warranty', 'Service Receipt', 'Other'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, newDocType === t && styles.chipActive]}
                  onPress={() => setNewDocType(t)}
                >
                  <Text style={[styles.chipText, newDocType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
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

      {/* Modal: Change Password */}
      <Modal visible={showChangePasswordModal} transparent animationType="fade" onRequestClose={() => setShowChangePasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Account Password</Text>

            <PasswordInput
              label="NEW PASSWORD"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              showStrength
            />

            <PasswordInput
              label="CONFIRM PASSWORD"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
            />

            <CustomButton
              title={updatingPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}
              onPress={handleChangePassword}
              disabled={updatingPassword}
            />
            <CustomButton title="CANCEL" variant="secondary" onPress={() => setShowChangePasswordModal(false)} />
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
    gap: 14,
  },
  profileHeaderCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    gap: 8,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileHeaderName: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  profileHeaderEmail: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  profileHeaderPhone: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.success,
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
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: 4,
  },
  editProfileBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  infoGrid: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  infoVal: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
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
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  addBikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addBikeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyGarageCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyGarageTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyGarageDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  garageCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  garageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bikeIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  bikeTitle: {
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
  bikeMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  garageDetailsGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailBox: {
    flex: 1,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  detailVal: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  garageActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  garageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  garageActionText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterPillsRow: {
    marginVertical: 4,
  },
  pill: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  pillText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  pillTextActive: {
    color: COLORS.primary,
  },
  emptyDocsCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
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
    fontSize: 10,
    marginTop: 2,
  },
  docBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  docActionIconBtn: {
    padding: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  menuRowTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  menuRowTitleFlex: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  menuRowSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  settingSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  settingSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.dangerBg,
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 14,
  },
  specBox: {
    width: '46%',
  },
  specBoxLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  specBoxVal: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.primary,
  },
});
