import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, AppThemeColors } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  Bike,
  Check,
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  Gauge,
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  FolderOpen,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { createMotorcycle } from '../../services/motorcycleService';
import { createReminder } from '../../services/maintenanceService';
import { createDocument, uploadAndCreateDocument } from '../../services/documentService';
import { uploadPhotoUriToStorage } from '../../services/photoService';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../i18n';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';

const BRANDS = ['Yamaha', 'Honda', 'Modenas', 'Suzuki', 'Kawasaki', 'SYM', 'Benelli', 'KTM', 'BMW', 'Ducati'];
const POPULAR_MODELS = ['Y15ZR', 'Y16ZR', 'RS150R', 'LC135', 'EX5', 'NVX 155', 'VF3i', 'Dash 125', 'MT-09', 'R15', 'Ninja 250'];
const FUEL_TYPES = ['Petrol', 'Electric', 'Hybrid'];
const TRANSMISSIONS = ['Manual', 'Automatic', 'Semi-Auto'];
const ENGINE_OILS = ['10W-40', '10W-30', '15W-50', '20W-50', 'Fully Synthetic 10W-40'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SetupMotorcycleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [loading, setLoading] = useState(false);
  const [createdBikeId, setCreatedBikeId] = useState<string | null>(null);

  // Step 1: Basic Information - ALL INPUTS EMPTY INITIALLY
  const [nickname, setNickname] = useState('');
  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [year, setYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');

  // Step 2: Technical Information - ALL INPUTS EMPTY INITIALLY
  const [engineCc, setEngineCc] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');
  const [engineOil, setEngineOil] = useState('');
  const [frontTyre, setFrontTyre] = useState('');
  const [rearTyre, setRearTyre] = useState('');

  // Step 3: Motorcycle Status & Mileage - ALL INPUTS EMPTY INITIALLY
  const [currentMileage, setCurrentMileage] = useState('');
  const [lastServiceDate, setLastServiceDate] = useState('');
  const [lastServiceMileage, setLastServiceMileage] = useState('');
  const [nextServiceMileage, setNextServiceMileage] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');

  // Interactive Visual Calendar Modal State
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [targetDateField, setTargetDateField] = useState<'lastService' | 'warranty' | null>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Step 4: Documents & Photos
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [insuranceDocName, setInsuranceDocName] = useState<string | null>(null);
  const [insuranceDocAsset, setInsuranceDocAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [roadTaxDocName, setRoadTaxDocName] = useState<string | null>(null);
  const [roadTaxDocAsset, setRoadTaxDocAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [warrantyDocName, setWarrantyDocName] = useState<string | null>(null);
  const [warrantyDocAsset, setWarrantyDocAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const finalBrand = customBrand.trim() || brand;
  const finalModel = customModel.trim() || model;

  // Step validation with comprehensive exception checks
  const validateStep = (targetStep: number): boolean => {
    if (targetStep === 1) {
      if (!finalBrand || !finalModel || !year || !plateNumber.trim()) {
        Alert.alert('Incomplete Info', 'Please enter/select brand, model, manufacturing year, and registration plate number.');
        return false;
      }
      const yr = parseInt(year, 10);
      if (isNaN(yr) || yr < 1900 || yr > new Date().getFullYear() + 1) {
        Alert.alert('Invalid Manufacturing Year', `Please enter a valid manufacturing year between 1900 and ${new Date().getFullYear() + 1}.`);
        return false;
      }
      if (plateNumber.trim().length < 2) {
        Alert.alert('Invalid Plate Number', 'Please enter a valid registration plate number (e.g. ABC 1234).');
        return false;
      }
    } else if (targetStep === 2) {
      if (engineCc.trim()) {
        const cc = parseInt(engineCc, 10);
        if (isNaN(cc) || cc <= 0 || cc > 10000) {
          Alert.alert('Invalid Engine Capacity', 'Engine CC must be a valid positive number (e.g. 150, 250, 1000).');
          return false;
        }
      }
    } else if (targetStep === 3) {
      if (!currentMileage.trim()) {
        Alert.alert('Incomplete Mileage', 'Please enter your motorcycle current odometer mileage.');
        return false;
      }
      const odo = parseInt(currentMileage, 10);
      if (isNaN(odo) || odo < 0) {
        Alert.alert('Invalid Mileage', 'Please enter a valid numeric current mileage (e.g. 28000).');
        return false;
      }
      if (lastServiceMileage.trim()) {
        const lastOdo = parseInt(lastServiceMileage, 10);
        if (isNaN(lastOdo) || lastOdo < 0) {
          Alert.alert('Invalid Service Mileage', 'Last service mileage must be a valid number.');
          return false;
        }
      }
    }
    return true;
  };

  const handleNextStep = () => {
    try {
      if (!validateStep(step)) return;
      if (step < 5) {
        setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5 | 6);
      }
    } catch (err: any) {
      console.error('Step navigation error:', err);
      Alert.alert(t('common.error'), t('errors.invalidForm'));
    }
  };

  const handlePrevStep = () => {
    if (step > 1 && step <= 5) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5 | 6);
    }
  };

  // ─── INTERACTIVE CALENDAR DATE PICKER LOGIC ───────────────────
  const openDatePicker = (field: 'lastService' | 'warranty') => {
    try {
      setTargetDateField(field);
      const existingVal = field === 'lastService' ? lastServiceDate : warrantyExpiry;
      if (existingVal) {
        const parts = existingVal.split('-');
        if (parts.length === 3) {
          setCalYear(parseInt(parts[0], 10));
          setCalMonth(parseInt(parts[1], 10) - 1);
          setSelectedDay(parseInt(parts[2], 10));
        }
      } else {
        const today = new Date();
        setCalYear(today.getFullYear());
        setCalMonth(today.getMonth());
        setSelectedDay(today.getDate());
      }
      setDateModalVisible(true);
    } catch (err) {
      console.error('DatePicker open error:', err);
      setDateModalVisible(true);
    }
  };

  const selectDateDay = (day: number) => {
    try {
      setSelectedDay(day);
      const formattedMonth = String(calMonth + 1).padStart(2, '0');
      const formattedDay = String(day).padStart(2, '0');
      const dateStr = `${calYear}-${formattedMonth}-${formattedDay}`;

      if (targetDateField === 'lastService') {
        setLastServiceDate(dateStr);
      } else {
        setWarrantyExpiry(dateStr);
      }
      setDateModalVisible(false);
    } catch (err) {
      console.error('Select date error:', err);
      setDateModalVisible(false);
    }
  };

  const changeCalMonth = (delta: number) => {
    let newM = calMonth + delta;
    let newY = calYear;
    if (newM < 0) {
      newM = 11;
      newY -= 1;
    } else if (newM > 11) {
      newM = 0;
      newY += 1;
    }
    setCalMonth(newM);
    setCalYear(newY);
  };

  const setPresetDate = (monthsOffset: number) => {
    try {
      const d = new Date();
      d.setMonth(d.getMonth() + monthsOffset);
      const dateStr = d.toISOString().split('T')[0];
      if (targetDateField === 'lastService') {
        setLastServiceDate(dateStr);
      } else {
        setWarrantyExpiry(dateStr);
      }
      setDateModalVisible(false);
    } catch (err) {
      console.error('Preset date error:', err);
      setDateModalVisible(false);
    }
  };

  // ─── NATIVE FILE & PHOTO PICKING WITH EXCEPTION HANDLING ────
  const handlePickCoverPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Selection Options',
          'Permission to photo gallery was not granted. Would you like to select a sample motorcycle photo?',
          [
            {
              text: 'Yamaha Y16 Photo',
              onPress: () => {
                setPhotoUrl('https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800');
                setPhotoName('Y16_Sideview.jpg');
              },
            },
            {
              text: 'Sport Bike Photo',
              onPress: () => {
                setPhotoUrl('https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800');
                setPhotoName('Sport_Motorcycle.jpg');
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
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhotoUrl(asset.uri);
        setPhotoName(asset.fileName || 'motorcycle_cover.jpg');
      }
    } catch (err: any) {
      console.error('Error launching image picker:', err);
      Alert.alert('Photo Picker Error', err?.message || 'Failed to select image. Setting sample photo.');
      setPhotoUrl('https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800');
      setPhotoName('motorcycle_sideview.jpg');
    }
  };

  const handlePickDocumentFile = async (
    title: string,
    currentName: string | null,
    setName: (val: string | null) => void,
    setAsset: (val: DocumentPicker.DocumentPickerAsset | null) => void,
    defaultFileName: string
  ) => {
    if (currentName) {
      setName(null);
      setAsset(null);
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const doc = result.assets[0];
        setName(doc.name || defaultFileName);
        setAsset(doc);
      }
    } catch (err: any) {
      console.error('Error launching document picker:', err);
      Alert.alert('File Picker Error', 'Unable to open file picker. Please try again.');
    }
  };

  // Helper for step header subtitle
  const getHeaderSubtitle = () => {
    if (step === 1) return t('motorcycle.step1BasicInfo');
    if (step === 2) return t('motorcycle.step2Specifications');
    if (step === 3) return t('motorcycle.currentOdometer');
    if (step === 4) return t('motorcycle.step3Photo');
    if (step === 5) return t('motorcycle.registerMotorcycle');
    if (step === 6) return t('motorcycle.garage');
    return t('motorcycle.registerNew');
  };

  // ─── FINAL REGISTRATION (SAVE TO DB) WITH BULLETPROOF EXCEPTION HANDLING
  const handleFinalRegister = async () => {
    if (!user?.id) {
      Alert.alert(t('common.required'), t('errors.unauthorized'));
      return;
    }

    setLoading(true);
    try {
      const odo = parseInt(currentMileage, 10) || 0;
      const yr = parseInt(year, 10) || new Date().getFullYear();
      const lastSvcOdo = parseInt(lastServiceMileage, 10) || odo;
      const nextSvcOdo = parseInt(nextServiceMileage, 10) || (odo + 3000);
      const cleanWarrantyExpiry = warrantyExpiry && warrantyExpiry.trim() ? warrantyExpiry.trim() : null;
      const cleanLastServiceDate = lastServiceDate && lastServiceDate.trim() ? lastServiceDate.trim() : null;

      // 1. Upload photo to Supabase storage if it's a blob/local file URI
      let finalPhotoUrl = photoUrl ? photoUrl.trim() : null;
      if (finalPhotoUrl && (finalPhotoUrl.startsWith('blob:') || finalPhotoUrl.startsWith('file:') || finalPhotoUrl.startsWith('data:'))) {
        try {
          finalPhotoUrl = await uploadPhotoUriToStorage(user.id, 'motorcycles', finalPhotoUrl);
        } catch (photoErr) {
          console.warn('Motorcycle photo upload storage notice (non-fatal):', photoErr);
        }
      }

      // 2. Create primary motorcycle record
      let bike: any = null;
      try {
        bike = await createMotorcycle({
          owner_id: user.id,
          nickname: nickname.trim() || `${finalBrand} ${finalModel}`.trim() || 'My Motorcycle',
          brand: finalBrand,
          model: finalModel,
          year: yr,
          plate_number: plateNumber.trim().toUpperCase(),
          engine_cc: parseInt(engineCc, 10) || null,
          fuel_type: fuelType.trim() || null,
          transmission: transmission.trim() || null,
          engine_oil_type: engineOil.trim() || null,
          front_tyre_size: frontTyre.trim() || null,
          rear_tyre_size: rearTyre.trim() || null,
          current_mileage: odo,
          photo_url: finalPhotoUrl || null,
        });
      } catch (bikeErr: any) {
        if (bikeErr?.message?.includes('already registered') || bikeErr?.message?.includes('23505')) {
          Alert.alert(
            'Duplicate Plate Number',
            `Plate number "${plateNumber.toUpperCase()}" is already registered in your garage. Please check your plate number.`,
            [{ text: 'Go Back & Edit Plate', onPress: () => setStep(1) }]
          );
          return;
        }
        throw bikeErr;
      }

      setCreatedBikeId(bike.id);

      // 2. Insert initial mileage log (fault tolerant)
      try {
        await supabase.from('mileage_logs').insert({
          motorcycle_id: bike.id,
          previous_mileage: 0,
          new_mileage: odo,
          source: 'initial_registration',
        });
      } catch (logErr) {
        console.warn('Initial mileage log warning (non-fatal):', logErr);
      }

      // 3. Create initial maintenance reminder (fault tolerant)
      try {
        const nextSvcDate = cleanLastServiceDate
          ? new Date(new Date(cleanLastServiceDate).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        await createReminder({
          motorcycle_id: bike.id,
          customer_id: user.id,
          title: 'Regular Engine Oil & Filter Service',
          service_category: 'Engine Oil',
          next_service_mileage: nextSvcOdo,
          next_service_date: nextSvcDate,
          status: 'upcoming',
          notes: `Last service recorded at ${lastSvcOdo} km on ${cleanLastServiceDate || 'N/A'}.`,
        });
      } catch (remErr) {
        console.warn('Initial reminder creation warning (non-fatal):', remErr);
      }

      // 4. Upload digital documents to Supabase Storage + insert DB records (fault tolerant)
      try {
        if (insuranceDocAsset) {
          await uploadAndCreateDocument({
            customer_id: user.id,
            motorcycle_id: bike.id,
            title: `Insurance Policy - ${plateNumber.trim().toUpperCase()}`,
            type: 'Insurance',
            file: insuranceDocAsset,
            expiry_date: cleanWarrantyExpiry,
          });
        }

        if (roadTaxDocAsset) {
          await uploadAndCreateDocument({
            customer_id: user.id,
            motorcycle_id: bike.id,
            title: `Road Tax License - ${plateNumber.trim().toUpperCase()}`,
            type: 'Road Tax',
            file: roadTaxDocAsset,
          });
        }

        if (warrantyDocAsset) {
          await uploadAndCreateDocument({
            customer_id: user.id,
            motorcycle_id: bike.id,
            title: `Manufacturer Warranty Certificate`,
            type: 'Warranty',
            file: warrantyDocAsset,
            expiry_date: cleanWarrantyExpiry,
          });
        }
      } catch (docErr) {
        console.warn('Document upload warning (non-fatal):', docErr);
      }

      setStep(6);
    } catch (err: any) {
      console.error('Registration Exception:', err);
      const userMessage = err?.message || 'Failed to save motorcycle. Please check your network connection and try again.';
      Alert.alert('Registration Failed', userMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render days grid for the calendar
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Mon=0, Sun=6

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={step === 6 ? t('motorcycle.registrationComplete') : t('motorcycle.registerNew')}
        subtitle={getHeaderSubtitle()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer maxWidth={640}>
          {/* Step Progress Bar */}
          {step <= 4 && (
          <View style={styles.progressContainer}>
            <View style={styles.stepsRow}>
              {[1, 2, 3, 4].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepBadge,
                    step === s && styles.stepBadgeActive,
                    step > s && styles.stepBadgeCompleted,
                  ]}
                >
                  {step > s ? (
                    <Check color="#000" size={14} />
                  ) : (
                    <Text style={[styles.stepNumberText, step === s && styles.stepNumberTextActive]}>
                      {s}
                    </Text>
                  )}
                </View>
              ))}
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.fillTrack, { width: `${((step - 1) / 3) * 100}%` }]} />
            </View>
          </View>
        )}

        {/* ==================== STEP 1: BASIC INFO ==================== */}
        {step === 1 && (
          <View style={styles.formCard}>
            <Text style={styles.stepTitle}>{t('motorcycle.step1BasicInfo').toUpperCase()}</Text>
            <Text style={styles.stepDesc}>{t('motorcycle.details')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('motorcycle.nickname').toUpperCase()}</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder={t('motorcycle.nicknamePlaceholder')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>{t('motorcycle.brand').toUpperCase()}</Text>
            <View style={styles.chipsRow}>
              {BRANDS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.chip, brand === b && !customBrand && styles.chipActive]}
                  onPress={() => { setBrand(b); setCustomBrand(''); }}
                >
                  <Text style={[styles.chipText, brand === b && !customBrand && styles.chipTextActive]}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={customBrand}
              onChangeText={setCustomBrand}
              placeholder={t('motorcycle.selectBrand')}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>{t('motorcycle.model').toUpperCase()}</Text>
            <View style={styles.chipsRow}>
              {POPULAR_MODELS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, model === m && !customModel && styles.chipActive]}
                  onPress={() => { setModel(m); setCustomModel(''); }}
                >
                  <Text style={[styles.chipText, model === m && !customModel && styles.chipTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={customModel}
              onChangeText={setCustomModel}
              placeholder={t('motorcycle.selectModel')}
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('motorcycle.year').toUpperCase()}</Text>
                <TextInput
                  style={styles.input}
                  value={year}
                  onChangeText={setYear}
                  placeholder={t('motorcycle.yearPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('motorcycle.plateNumber').toUpperCase()}</Text>
                <TextInput
                  style={styles.input}
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                  placeholder={t('motorcycle.plateNumberPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <CustomButton
              title={`${t('common.next')} →`}
              onPress={handleNextStep}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        {/* ==================== STEP 2: TECHNICAL INFO ==================== */}
        {step === 2 && (
          <View style={styles.formCard}>
            <Text style={styles.stepTitle}>{t('motorcycle.technicalInfo').toUpperCase()}</Text>
            <Text style={styles.stepDesc}>{t('motorcycle.technicalInfoDesc')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('motorcycle.engineCapacity').toUpperCase()}</Text>
              <TextInput
                style={styles.input}
                value={engineCc}
                onChangeText={setEngineCc}
                placeholder="e.g. 155"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>{t('motorcycle.fuelType').toUpperCase()}</Text>
            <View style={styles.chipsRow}>
              {FUEL_TYPES.map((ft) => (
                <TouchableOpacity
                  key={ft}
                  style={[styles.chip, fuelType === ft && styles.chipActive]}
                  onPress={() => setFuelType(ft)}
                >
                  <Text style={[styles.chipText, fuelType === ft && styles.chipTextActive]}>{ft}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>{t('motorcycle.transmission').toUpperCase()}</Text>
            <View style={styles.chipsRow}>
              {TRANSMISSIONS.map((tItem) => (
                <TouchableOpacity
                  key={tItem}
                  style={[styles.chip, transmission === tItem && styles.chipActive]}
                  onPress={() => setTransmission(tItem)}
                >
                  <Text style={[styles.chipText, transmission === tItem && styles.chipTextActive]}>{tItem}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>{t('motorcycle.engineOilGrade').toUpperCase()}</Text>
            <View style={styles.chipsRow}>
              {ENGINE_OILS.map((eo) => (
                <TouchableOpacity
                  key={eo}
                  style={[styles.chip, engineOil === eo && styles.chipActive]}
                  onPress={() => setEngineOil(eo)}
                >
                  <Text style={[styles.chipText, engineOil === eo && styles.chipTextActive]}>{eo}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('motorcycle.tyreFront').toUpperCase()}</Text>
                <TextInput
                  style={styles.input}
                  value={frontTyre}
                  onChangeText={setFrontTyre}
                  placeholder="e.g. 90/80-17"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('motorcycle.tyreRear').toUpperCase()}</Text>
                <TextInput
                  style={styles.input}
                  value={rearTyre}
                  onChangeText={setRearTyre}
                  placeholder="e.g. 120/70-17"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={handlePrevStep}>
                <ArrowLeft color={colors.textPrimary} size={16} />
                <Text style={styles.backStepText}>{t('common.back')}</Text>
              </TouchableOpacity>
              <CustomButton
                title={`${t('common.next')} →`}
                onPress={handleNextStep}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* ==================== STEP 3: STATUS & MILEAGE ==================== */}
        {step === 3 && (
          <View style={styles.formCard}>
            <Text style={styles.stepTitle}>{t('motorcycle.statusAndMileage').toUpperCase()}</Text>
            <Text style={styles.stepDesc}>{t('motorcycle.statusAndMileageDesc')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('motorcycle.currentOdometer').toUpperCase()} *</Text>
              <TextInput
                style={styles.input}
                value={currentMileage}
                onChangeText={setCurrentMileage}
                placeholder="e.g. 28000"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('motorcycle.lastServiceDate').toUpperCase()}</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => openDatePicker('lastService')}
                  activeOpacity={0.8}
                >
                  <CalendarIcon color={colors.primary} size={16} />
                  <Text style={[
                    styles.datePickerBtnText, 
                    !lastServiceDate ? { color: colors.textMuted } : { color: isDark ? colors.textPrimary : '#000000' }
                  ]}>
                    {lastServiceDate || `${t('common.date')} 📅`}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('motorcycle.lastServiceMileage').toUpperCase()}</Text>
                <TextInput
                  style={styles.input}
                  value={lastServiceMileage}
                  onChangeText={setLastServiceMileage}
                  placeholder="e.g. 25000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('motorcycle.nextServiceTarget').toUpperCase()}</Text>
                <TextInput
                  style={styles.input}
                  value={nextServiceMileage}
                  onChangeText={setNextServiceMileage}
                  placeholder="e.g. 28000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('motorcycle.warrantyExpiry').toUpperCase()} ({t('common.optional').toUpperCase()})</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => openDatePicker('warranty')}
                  activeOpacity={0.8}
                >
                  <CalendarIcon color={colors.primary} size={16} />
                  <Text style={[
                    styles.datePickerBtnText, 
                    !warrantyExpiry ? { color: colors.textMuted } : { color: isDark ? colors.textPrimary : '#000000' }
                  ]}>
                    {warrantyExpiry || `${t('common.date')} 📅`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={handlePrevStep}>
                <ArrowLeft color={colors.textPrimary} size={16} />
                <Text style={styles.backStepText}>{t('common.back')}</Text>
              </TouchableOpacity>
              <CustomButton
                title={`${t('common.next')} →`}
                onPress={handleNextStep}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* ==================== STEP 4: PHOTO & DOCUMENTS ==================== */}
        {step === 4 && (
          <View style={styles.formCard}>
            <Text style={styles.stepTitle}>{t('motorcycle.photoAndDocs').toUpperCase()}</Text>
            <Text style={styles.stepDesc}>{t('motorcycle.photoAndDocsDesc')}</Text>

            <Text style={styles.sectionHeaderLabel}>{t('motorcycle.step3Photo').toUpperCase()}</Text>
            <TouchableOpacity
              style={[styles.uploadBox, photoUrl && styles.uploadBoxActive]}
              onPress={handlePickCoverPhoto}
              activeOpacity={0.8}
            >
              {photoUrl ? (
                <View style={styles.previewPhotoContainer}>
                  <Image source={{ uri: photoUrl }} style={styles.previewImage} resizeMode="cover" />
                  <View style={styles.photoActiveBadge}>
                    <Check color="#000" size={14} />
                    <Text style={styles.photoActiveText}>{photoName || t('motorcycle.photoUrl')}</Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 4 }}>{t('motorcycle.tapToChange')}</Text>
                </View>
              ) : (
                <>
                  <Camera color={colors.primary} size={32} />
                  <Text style={styles.uploadBoxTitle}>+ {t('motorcycle.chooseFromGallery')}</Text>
                  <Text style={styles.uploadBoxSub}>{t('motorcycle.photoFormatNotice')}</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.sectionHeaderLabel, { marginTop: 16 }]}>{t('motorcycle.digitalVault').toUpperCase()} ({t('common.optional').toUpperCase()})</Text>
            <View style={styles.docUploadGrid}>
              {[
                { title: t('motorcycle.insurance'), state: insuranceDocName, setter: setInsuranceDocName, assetSetter: setInsuranceDocAsset, defaultVal: 'Insurance_Policy_2026.pdf' },
                { title: t('motorcycle.roadtax'), state: roadTaxDocName, setter: setRoadTaxDocName, assetSetter: setRoadTaxDocAsset, defaultVal: 'RoadTax_Permit_2026.pdf' },
                { title: t('motorcycle.warranty'), state: warrantyDocName, setter: setWarrantyDocName, assetSetter: setWarrantyDocAsset, defaultVal: 'Warranty_Certificate.pdf' },
              ].map((doc) => (
                <View key={doc.title} style={styles.docRowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docItemTitle}>{doc.title}</Text>
                    <Text style={styles.docItemFile}>{doc.state ? `📄 ${doc.state}` : t('common.none')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.docUploadBtn, doc.state && styles.docUploadBtnSuccess]}
                    onPress={() => handlePickDocumentFile(doc.title, doc.state, doc.setter, doc.assetSetter, doc.defaultVal)}
                    activeOpacity={0.8}
                  >
                    <FolderOpen color={doc.state ? colors.success : colors.primary} size={14} />
                    <Text style={[styles.docUploadBtnText, doc.state && { color: colors.success }]}>
                      {doc.state ? t('common.remove') : t('common.upload')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={handlePrevStep}>
                <ArrowLeft color={colors.textPrimary} size={16} />
                <Text style={styles.backStepText}>{t('common.back')}</Text>
              </TouchableOpacity>
              <CustomButton
                title={`${t('common.reviewDetails')} →`}
                onPress={() => setStep(5)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* ==================== STEP 5: REVIEW MOTORCYCLE ==================== */}
        {step === 5 && (
          <View style={styles.formCard}>
            <Text style={styles.stepTitle}>{t('motorcycle.reviewMotorcycle').toUpperCase()}</Text>
            <Text style={styles.stepDesc}>{t('motorcycle.reviewMotorcycleDesc')}</Text>

            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={{ width: 56, height: 56, borderRadius: 12 }} />
                ) : (
                  <Bike color={colors.primary} size={32} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewTitle}>🏍️ {nickname || `${finalBrand} ${finalModel}`}</Text>
                  <Text style={styles.reviewSub}>{finalBrand} {finalModel} • {year}</Text>
                  <Text style={styles.reviewPlate}>{t('motorcycle.plateNumber')}: {plateNumber.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.specsGrid}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{t('motorcycle.engine').toUpperCase()}</Text>
                  <Text style={styles.specVal}>{engineCc ? `${engineCc} cc` : 'N/A'} ({fuelType || 'Petrol'})</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{t('motorcycle.transmission').toUpperCase()}</Text>
                  <Text style={styles.specVal}>{transmission || 'Manual'}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{t('motorcycle.lastServiceDate').toUpperCase()}</Text>
                  <Text style={[styles.specVal, !isDark && { color: '#000000' }]}>{lastServiceDate || 'N/A'}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{t('motorcycle.warrantyExpiry').toUpperCase()}</Text>
                  <Text style={[styles.specVal, !isDark && { color: '#000000' }]}>{warrantyExpiry || 'N/A'}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{t('motorcycle.tyreSize').toUpperCase()}</Text>
                  <Text style={styles.specVal}>{frontTyre || 'N/A'} / {rearTyre || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.mileageSummaryBox}>
                <Gauge color={colors.primary} size={20} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mileageLabel}>{t('motorcycle.currentOdometer').toUpperCase()}</Text>
                  <Text style={styles.mileageVal}>{parseInt(currentMileage || '0', 10).toLocaleString()} km</Text>
                </View>
              </View>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(4)}>
                <ArrowLeft color={colors.textPrimary} size={16} />
                <Text style={styles.backStepText}>← {t('common.edit')}</Text>
              </TouchableOpacity>
              <CustomButton
                title={loading ? t('common.saving').toUpperCase() : t('motorcycle.registerMotorcycle').toUpperCase()}
                onPress={handleFinalRegister}
                disabled={loading}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* ==================== STEP 6: SUCCESS CONFIRMATION ==================== */}
        {step === 6 && (
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 color={colors.success} size={56} />
            </View>

            <Text style={styles.successTitle}>✓ {t('motorcycle.registrationComplete')}</Text>
            <Text style={styles.successDesc}>
              Your <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{finalBrand} {finalModel}</Text> ({plateNumber.toUpperCase()}) has been successfully saved into the database.
            </Text>

            <View style={styles.successActions}>
              <CustomButton
                title={t('navigation.garage')}
                onPress={() => router.replace('/(customer)/profile')}
              />
              <CustomButton
                title={t('navigation.home')}
                variant="secondary"
                onPress={() => router.replace('/(customer)/home')}
              />
            </View>
          </View>
        )}
        </ResponsiveContainer>
      </ScrollView>

      {/* ==================== INTERACTIVE VISUAL CALENDAR MODAL ==================== */}
      <Modal
        visible={dateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dateModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>
                📅 {t('common.date')}
              </Text>
              <TouchableOpacity onPress={() => setDateModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X color={colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            {/* Quick Preset Buttons */}
            <Text style={styles.modalSub}>{t('common.filter')}:</Text>
            <View style={styles.datePresetsRow}>
              {targetDateField === 'lastService' ? (
                <>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setPresetDate(0)}>
                    <Text style={styles.presetChipText}>{t('common.today')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setPresetDate(-1)}>
                    <Text style={styles.presetChipText}>1 Mo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setPresetDate(-3)}>
                    <Text style={styles.presetChipText}>3 Mos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setPresetDate(-6)}>
                    <Text style={styles.presetChipText}>6 Mos</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setPresetDate(12)}>
                    <Text style={styles.presetChipText}>1 Year</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setPresetDate(24)}>
                    <Text style={styles.presetChipText}>2 Years</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setPresetDate(36)}>
                    <Text style={styles.presetChipText}>3 Years</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setPresetDate(60)}>
                    <Text style={styles.presetChipText}>5 Years</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Calendar Month & Year Switcher */}
            <View style={styles.calMonthHeader}>
              <TouchableOpacity style={styles.calNavBtn} onPress={() => changeCalMonth(-1)}>
                <ChevronLeft color={colors.textPrimary} size={20} />
              </TouchableOpacity>
              <Text style={styles.calMonthTitle}>
                {MONTH_NAMES[calMonth]} {calYear}
              </Text>
              <TouchableOpacity style={styles.calNavBtn} onPress={() => changeCalMonth(1)}>
                <ChevronRight color={colors.textPrimary} size={20} />
              </TouchableOpacity>
            </View>

            {/* Days of Week Header */}
            <View style={styles.weekDaysRow}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                <Text key={d} style={styles.weekDayText}>{d}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {/* Empty leading padding slots */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCellEmpty} />
              ))}

              {/* Days of month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isSelected = selectedDay === dayNum;
                return (
                  <TouchableOpacity
                    key={dayNum}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => selectDateDay(dayNum)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setDateModalVisible(false)}
            >
              <Text style={styles.closeModalBtnText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppThemeColors, isDark: boolean) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  progressContainer: {
    marginBottom: 20,
    gap: 8,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBadgeActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  stepBadgeCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepNumberText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  stepNumberTextActive: {
    color: colors.primary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fillTrack: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  formCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  stepTitle: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  stepDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
  },
  datePickerBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.primary,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backStepText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeaderLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  uploadBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    gap: 6,
  },
  uploadBoxActive: {
    borderColor: colors.primary,
    borderStyle: 'solid',
    backgroundColor: colors.primaryDark,
  },
  uploadBoxTitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  uploadBoxSub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  previewPhotoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  previewImage: {
    width: 220,
    height: 120,
    borderRadius: 12,
  },
  photoActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  photoActiveText: {
    color: isDark ? '#000' : '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  docUploadGrid: {
    gap: 10,
  },
  docRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docItemTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  docItemFile: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  docUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
  },
  docUploadBtnSuccess: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  docUploadBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  reviewSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  reviewPlate: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specItem: {
    width: '46%',
  },
  specLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  specVal: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  mileageSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainer,
    padding: 12,
    borderRadius: 12,
  },
  mileageLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  mileageVal: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  successCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success,
  },
  successTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  successDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  successActions: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dateModalCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  modalSub: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  datePresetsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
  },
  presetChipText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  calMonthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  calNavBtn: {
    padding: 4,
  },
  calMonthTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 38,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: isDark ? '#000' : '#FFF',
    fontWeight: '900',
  },
  closeModalBtn: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeModalBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
});
