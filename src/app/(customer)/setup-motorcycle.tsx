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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  Bike, ShieldCheck, Check, ArrowLeft, ArrowRight,
  Upload, FileText, CheckCircle2, ChevronRight, Wrench, Calendar, Gauge, Info,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { createMotorcycle } from '../../services/motorcycleService';
import { createReminder } from '../../services/maintenanceService';
import { createDocument } from '../../services/documentService';
import { supabase } from '../../lib/supabase';

const BRANDS = ['Yamaha', 'Honda', 'Modenas', 'Suzuki', 'Kawasaki', 'SYM', 'Benelli', 'KTM', 'BMW', 'Ducati'];
const POPULAR_MODELS = ['Y15ZR', 'RS150R', 'LC135', 'EX5', 'NVX 155', 'VF3i', 'Dash 125', 'MT-09', 'R15', 'Ninja 250'];
const YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2015 & Older'];
const FUEL_TYPES = ['Petrol', 'Electric', 'Hybrid'];
const TRANSMISSIONS = ['Manual', 'Automatic', 'Semi-Auto'];
const ENGINE_OILS = ['10W-40', '10W-30', '15W-50', '20W-50', 'Fully Synthetic 10W-40'];

export default function SetupMotorcycleScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [loading, setLoading] = useState(false);
  const [createdBikeId, setCreatedBikeId] = useState<string | null>(null);

  // Step 1: Basic Information
  const [nickname, setNickname] = useState('My Y15');
  const [brand, setBrand] = useState('Yamaha');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('Y15ZR');
  const [customModel, setCustomModel] = useState('');
  const [year, setYear] = useState('2024');
  const [plateNumber, setPlateNumber] = useState('ABC 1234');

  // Step 2: Technical Information
  const [engineCc, setEngineCc] = useState('150');
  const [fuelType, setFuelType] = useState('Petrol');
  const [transmission, setTransmission] = useState('Manual');
  const [engineOil, setEngineOil] = useState('10W-40');
  const [frontTyre, setFrontTyre] = useState('90/80-17');
  const [rearTyre, setRearTyre] = useState('120/70-17');

  // Step 3: Motorcycle Status & Mileage
  const [currentMileage, setCurrentMileage] = useState('24520');
  const [purchaseDate, setPurchaseDate] = useState('2024-01-15');
  const [lastServiceDate, setLastServiceDate] = useState('2026-07-15');
  const [lastServiceMileage, setLastServiceMileage] = useState('23000');
  const [nextServiceMileage, setNextServiceMileage] = useState('28000');
  const [warrantyExpiry, setWarrantyExpiry] = useState('2027-01-15');

  // Step 4: Documents & Photos
  const [hasPhoto, setHasPhoto] = useState(false);
  const [insuranceDocName, setInsuranceDocName] = useState<string | null>(null);
  const [roadTaxDocName, setRoadTaxDocName] = useState<string | null>(null);
  const [warrantyDocName, setWarrantyDocName] = useState<string | null>(null);

  const finalBrand = customBrand.trim() || brand;
  const finalModel = customModel.trim() || model;

  // Validation per step
  const validateStep = (targetStep: number): boolean => {
    if (targetStep === 1) {
      if (!finalBrand || !finalModel || !year || !plateNumber.trim()) {
        Alert.alert('Incomplete Info', 'Please specify brand, model, year, and registration plate number.');
        return false;
      }
    } else if (targetStep === 3) {
      const odo = parseInt(currentMileage, 10);
      if (isNaN(odo) || odo < 0) {
        Alert.alert('Invalid Mileage', 'Please enter a valid current mileage.');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(step)) return;
    if (step < 5) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5 | 6);
    }
  };

  const handlePrevStep = () => {
    if (step > 1 && step <= 5) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5 | 6);
    }
  };

  const handleFinalRegister = async () => {
    if (!user?.id) {
      Alert.alert('Authentication Required', 'Please sign in to register your motorcycle.');
      return;
    }

    setLoading(true);
    try {
      const odo = parseInt(currentMileage, 10) || 0;
      const yr = parseInt(year, 10) || 2024;
      const lastSvcOdo = parseInt(lastServiceMileage, 10) || odo;
      const nextSvcOdo = parseInt(nextServiceMileage, 10) || (odo + 3000);

      // 1. Create motorcycle record
      const bike = await createMotorcycle({
        owner_id: user.id,
        nickname: nickname.trim() || `${finalBrand} ${finalModel}`,
        brand: finalBrand,
        model: finalModel,
        year: yr,
        plate_number: plateNumber.trim().toUpperCase(),
        current_mileage: odo,
      });

      setCreatedBikeId(bike.id);

      // 2. Create mileage log
      await supabase.from('mileage_logs').insert({
        motorcycle_id: bike.id,
        previous_mileage: 0,
        new_mileage: odo,
        source: 'initial_registration',
      });

      // 3. Create initial maintenance reminder
      await createReminder({
        motorcycle_id: bike.id,
        title: 'Regular Engine Oil & Filter Service',
        service_category: 'Engine Oil',
        next_service_mileage: nextSvcOdo,
        next_service_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'upcoming',
        notes: `Last service recorded at ${lastSvcOdo} km on ${lastServiceDate || 'N/A'}.`,
      });

      // 4. Create document records if uploaded
      if (insuranceDocName) {
        await createDocument({
          customer_id: user.id,
          motorcycle_id: bike.id,
          title: `Insurance Policy - ${plateNumber.trim().toUpperCase()}`,
          type: 'Insurance',
          file_path: `docs/${user.id}/insurance.pdf`,
          expiry_date: warrantyExpiry || undefined,
        });
      }

      if (roadTaxDocName) {
        await createDocument({
          customer_id: user.id,
          motorcycle_id: bike.id,
          title: `Road Tax License - ${plateNumber.trim().toUpperCase()}`,
          type: 'Road Tax',
          file_path: `docs/${user.id}/roadtax.pdf`,
        });
      }

      if (warrantyDocName) {
        await createDocument({
          customer_id: user.id,
          motorcycle_id: bike.id,
          title: `Manufacturer Warranty Certificate`,
          type: 'Warranty',
          file_path: `docs/${user.id}/warranty.pdf`,
          expiry_date: warrantyExpiry || undefined,
        });
      }

      // 5. Move to Success step
      setStep(6);
    } catch (err: any) {
      Alert.alert('Registration Error', err?.message || 'Failed to register motorcycle to garage.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={step === 6 ? 'Registration Complete' : 'Register New Motorcycle'}
        subtitle={step === 6 ? 'Added to My Garage' : `Step ${step} of 4 — Setup Profile`}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.stepTitle}>STEP 1 — BASIC MOTORCYCLE INFORMATION</Text>
            <Text style={styles.stepDesc}>Enter your motorcycle identity and registration details.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MOTORCYCLE NICKNAME</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="e.g. My Y15"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>BRAND / MANUFACTURER</Text>
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
              placeholder="Or type other brand (e.g. BMW, Royal Enfield)"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>MODEL</Text>
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
              placeholder="Or type custom model (e.g. Y15ZR V2 Special Edition)"
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>MANUFACTURING YEAR</Text>
                <TextInput
                  style={styles.input}
                  value={year}
                  onChangeText={setYear}
                  placeholder="e.g. 2024"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>REGISTRATION / PLATE NO.</Text>
                <TextInput
                  style={styles.input}
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                  placeholder="e.g. ABC 1234"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <CustomButton
              title="Continue to Technical Details →"
              onPress={handleNextStep}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        {/* ==================== STEP 2: TECHNICAL INFO ==================== */}
        {step === 2 && (
          <View style={styles.formCard}>
            <Text style={styles.stepTitle}>STEP 2 — TECHNICAL INFORMATION</Text>
            <Text style={styles.stepDesc}>Configure engine and tyre specifications for accurate parts matching.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ENGINE CAPACITY (CC)</Text>
              <TextInput
                style={styles.input}
                value={engineCc}
                onChangeText={setEngineCc}
                placeholder="e.g. 150"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>FUEL TYPE</Text>
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

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>TRANSMISSION</Text>
            <View style={styles.chipsRow}>
              {TRANSMISSIONS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, transmission === t && styles.chipActive]}
                  onPress={() => setTransmission(t)}
                >
                  <Text style={[styles.chipText, transmission === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>RECOMMENDED ENGINE OIL GRADE</Text>
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
                <Text style={styles.inputLabel}>FRONT TYRE SIZE</Text>
                <TextInput
                  style={styles.input}
                  value={frontTyre}
                  onChangeText={setFrontTyre}
                  placeholder="e.g. 90/80-17"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>REAR TYRE SIZE</Text>
                <TextInput
                  style={styles.input}
                  value={rearTyre}
                  onChangeText={setRearTyre}
                  placeholder="e.g. 120/70-17"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={handlePrevStep}>
                <ArrowLeft color={COLORS.textPrimary} size={16} />
                <Text style={styles.backStepText}>Back</Text>
              </TouchableOpacity>
              <CustomButton
                title="Continue to Status →"
                onPress={handleNextStep}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* ==================== STEP 3: STATUS & MILEAGE ==================== */}
        {step === 3 && (
          <View style={styles.formCard}>
            <Text style={styles.stepTitle}>STEP 3 — MOTORCYCLE STATUS & MILEAGE</Text>
            <Text style={styles.stepDesc}>Used by RiderHood to calculate automated maintenance reminders.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CURRENT ODOMETER MILEAGE (KM) *</Text>
              <TextInput
                style={styles.input}
                value={currentMileage}
                onChangeText={setCurrentMileage}
                placeholder="e.g. 24520"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>LAST SERVICE DATE</Text>
                <TextInput
                  style={styles.input}
                  value={lastServiceDate}
                  onChangeText={setLastServiceDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>LAST SERVICE MILEAGE</Text>
                <TextInput
                  style={styles.input}
                  value={lastServiceMileage}
                  onChangeText={setLastServiceMileage}
                  placeholder="e.g. 23000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>NEXT SERVICE TARGET (KM)</Text>
                <TextInput
                  style={styles.input}
                  value={nextServiceMileage}
                  onChangeText={setNextServiceMileage}
                  placeholder="e.g. 28000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>WARRANTY EXPIRY (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  value={warrantyExpiry}
                  onChangeText={setWarrantyExpiry}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={handlePrevStep}>
                <ArrowLeft color={COLORS.textPrimary} size={16} />
                <Text style={styles.backStepText}>Back</Text>
              </TouchableOpacity>
              <CustomButton
                title="Continue to Media →"
                onPress={handleNextStep}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* ==================== STEP 4: PHOTO & DOCUMENTS ==================== */}
        {step === 4 && (
          <View style={styles.formCard}>
            <Text style={styles.stepTitle}>STEP 4 — MOTORCYCLE PHOTO & DOCUMENTS</Text>
            <Text style={styles.stepDesc}>Upload digital copies of road tax, insurance, and warranty documents.</Text>

            <Text style={styles.sectionHeaderLabel}>MOTORCYCLE PHOTO</Text>
            <TouchableOpacity
              style={[styles.uploadBox, hasPhoto && styles.uploadBoxActive]}
              onPress={() => setHasPhoto(!hasPhoto)}
            >
              <Upload color={hasPhoto ? COLORS.primary : COLORS.textMuted} size={28} />
              <Text style={styles.uploadBoxTitle}>
                {hasPhoto ? '✓ Photo Selected (motorcycle_sideview.jpg)' : '+ Attach Motorcycle Cover Photo'}
              </Text>
              <Text style={styles.uploadBoxSub}>Supports PNG, JPG up to 5MB</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionHeaderLabel, { marginTop: 16 }]}>DIGITAL DOCUMENTS (OPTIONAL)</Text>
            <View style={styles.docUploadGrid}>
              {[
                { title: 'Insurance Policy', state: insuranceDocName, setter: setInsuranceDocName, defaultVal: 'Insurance_Policy_2026.pdf' },
                { title: 'Road Tax License', state: roadTaxDocName, setter: setRoadTaxDocName, defaultVal: 'RoadTax_Permit_2026.pdf' },
                { title: 'Warranty Certificate', state: warrantyDocName, setter: setWarrantyDocName, defaultVal: 'Yamaha_Warranty.pdf' },
              ].map((doc) => (
                <View key={doc.title} style={styles.docRowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docItemTitle}>{doc.title}</Text>
                    <Text style={styles.docItemFile}>{doc.state ? `📄 ${doc.state}` : 'Not attached'}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.docUploadBtn, doc.state && styles.docUploadBtnSuccess]}
                    onPress={() => doc.setter(doc.state ? null : doc.defaultVal)}
                  >
                    <Text style={[styles.docUploadBtnText, doc.state && { color: COLORS.success }]}>
                      {doc.state ? 'Remove' : 'Upload'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={handlePrevStep}>
                <ArrowLeft color={COLORS.textPrimary} size={16} />
                <Text style={styles.backStepText}>Back</Text>
              </TouchableOpacity>
              <CustomButton
                title="Review Motorcycle Details →"
                onPress={() => setStep(5)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* ==================== STEP 5: REVIEW MOTORCYCLE ==================== */}
        {step === 5 && (
          <View style={styles.formCard}>
            <Text style={styles.stepTitle}>REVIEW MOTORCYCLE</Text>
            <Text style={styles.stepDesc}>Verify all entered information before registering to your garage.</Text>

            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Bike color={COLORS.primary} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewTitle}>🏍️ {nickname || `${finalBrand} ${finalModel}`}</Text>
                  <Text style={styles.reviewSub}>{finalBrand} {finalModel} • {year}</Text>
                  <Text style={styles.reviewPlate}>Plate: {plateNumber.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.specsGrid}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>ENGINE</Text>
                  <Text style={styles.specVal}>{engineCc} cc ({fuelType})</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>TRANSMISSION</Text>
                  <Text style={styles.specVal}>{transmission}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>ENGINE OIL</Text>
                  <Text style={styles.specVal}>{engineOil}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>TYRES</Text>
                  <Text style={styles.specVal}>{frontTyre} / {rearTyre}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.mileageSummaryBox}>
                <Gauge color={COLORS.primary} size={20} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mileageLabel}>CURRENT ODOMETER</Text>
                  <Text style={styles.mileageVal}>{parseInt(currentMileage || '0', 10).toLocaleString()} km</Text>
                </View>
              </View>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(4)}>
                <ArrowLeft color={COLORS.textPrimary} size={16} />
                <Text style={styles.backStepText}>← Edit</Text>
              </TouchableOpacity>
              <CustomButton
                title={loading ? 'REGISTERING...' : 'REGISTER MOTORCYCLE'}
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
              <CheckCircle2 color={COLORS.success} size={56} />
            </View>

            <Text style={styles.successTitle}>✓ Motorcycle Registered</Text>
            <Text style={styles.successDesc}>
              Your <Text style={{ color: COLORS.textPrimary, fontWeight: '800' }}>{finalBrand} {finalModel}</Text> ({plateNumber.toUpperCase()}) has been successfully added to your garage with active maintenance tracking.
            </Text>

            <View style={styles.successActions}>
              <CustomButton
                title="View Garage & Profile"
                onPress={() => router.replace('/(customer)/profile')}
              />
              <CustomButton
                title="Back to Customer Dashboard"
                variant="secondary"
                onPress={() => router.replace('/(customer)/home')}
              />
            </View>
          </View>
        )}
      </ScrollView>
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
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepBadgeActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  stepBadgeCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepNumberText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  stepNumberTextActive: {
    color: COLORS.primary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fillTrack: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  formCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  stepTitle: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  stepDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.primary,
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
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backStepText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeaderLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  uploadBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 6,
  },
  uploadBoxActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDark,
    borderStyle: 'solid',
  },
  uploadBoxTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  uploadBoxSub: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  docUploadGrid: {
    gap: 10,
  },
  docRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  docItemTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  docItemFile: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  docUploadBtn: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docUploadBtnSuccess: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successBg,
  },
  docUploadBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  reviewSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  reviewPlate: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
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
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  specVal: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  mileageSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceContainer,
    padding: 12,
    borderRadius: 12,
  },
  mileageLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  mileageVal: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  successCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.success,
    gap: 16,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    color: COLORS.success,
    fontSize: 22,
    fontWeight: '900',
  },
  successDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  successActions: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
});
