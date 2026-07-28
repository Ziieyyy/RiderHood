import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react-native';

export default function ReportProblemScreen() {
  const router = useRouter();

  const [category, setCategory] = useState<string>('App Bug');
  const [description, setDescription] = useState('');
  const [screenshotAttached, setScreenshotAttached] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    'App Bug',
    'Booking Issue',
    'Payment / Invoice',
    'Workshop Dispute',
    'Account Issue',
    'Other',
  ];

  const handleSubmitReport = () => {
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please tell us what happened so our team can investigate.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Report Problem" showBack />
        <View style={styles.successBox}>
          <View style={styles.successCircle}>
            <CheckCircle2 color={COLORS.success} size={48} />
          </View>
          <Text style={styles.successTitle}>Report Submitted ✓</Text>
          <Text style={styles.successSub}>
            Thank you. Our technical support team will review your report and follow up via email within 24 hours.
          </Text>
          <CustomButton
            title="BACK TO HOME"
            onPress={() => router.replace('/(customer)/home')}
            style={{ marginTop: 12 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Report a Problem"
        subtitle="Submit technical issues or feedback to RiderHood team"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Category Picker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PROBLEM CATEGORY</Text>
          <View style={styles.catGrid}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, category === cat && styles.catChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description Textarea */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TELL US WHAT HAPPENED</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Please provide steps to reproduce the issue, error messages or details..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={5}
          />
        </View>

        {/* Screenshot Attachment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ATTACH SCREENSHOT (OPTIONAL)</Text>
          <TouchableOpacity
            style={styles.attachBox}
            onPress={() => setScreenshotAttached(!screenshotAttached)}
          >
            {screenshotAttached ? (
              <>
                <ImageIcon color={COLORS.primary} size={24} />
                <Text style={styles.attachTextActive}>Screenshot_2026-07-30.png (Attached)</Text>
              </>
            ) : (
              <>
                <Camera color={COLORS.textMuted} size={24} />
                <Text style={styles.attachText}>+ Tap to upload screenshot</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <CustomButton
          title={submitting ? 'SUBMITTING REPORT...' : 'SUBMIT REPORT'}
          onPress={handleSubmitReport}
          disabled={submitting}
          style={{ marginTop: 8 }}
        />
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
    gap: 14,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
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
    fontWeight: '800',
  },
  catChipTextActive: {
    color: COLORS.primary,
  },
  textArea: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  attachBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  attachText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  attachTextActive: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  successBox: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    margin: 16,
    borderWidth: 1,
    borderColor: COLORS.success,
    gap: 12,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  successSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
