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
import { COLORS, AppThemeColors } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';

export default function ReportProblemScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

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
      Alert.alert(t('common.required'), t('errors.requiredField'));
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
        <Header title={t('settings.reportProblem')} showBack />
        <View style={styles.successBox}>
          <View style={styles.successCircle}>
            <CheckCircle2 color={colors.success} size={48} />
          </View>
          <Text style={styles.successTitle}>{t('settings.reportSubmitted')}</Text>
          <Text style={styles.successSub}>
            {t('settings.reportSubmittedDesc')}
          </Text>
          <CustomButton
            title={t('navigation.home').toUpperCase()}
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
        title={t('settings.reportProblem')}
        subtitle={t('settings.reportProblemDesc')}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Category Picker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.problemCategory').toUpperCase()}</Text>
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
          <Text style={styles.cardTitle}>{t('settings.problemDescription').toUpperCase()}</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Please provide steps to reproduce the issue, error messages or details..."
            placeholderTextColor={colors.textMuted}
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
                <ImageIcon color={colors.primary} size={24} />
                <Text style={styles.attachTextActive}>Screenshot_2026-07-30.png (Attached)</Text>
              </>
            ) : (
              <>
                <Camera color={colors.textMuted} size={24} />
                <Text style={styles.attachText}>+ Tap to upload screenshot</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <CustomButton
          title={submitting ? t('settings.submittingReport').toUpperCase() : t('settings.submitReport').toUpperCase()}
          onPress={handleSubmitReport}
          disabled={submitting}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
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
    gap: 14,
  },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTitle: {
    color: colors.textMuted,
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
    fontWeight: '800',
  },
  catChipTextActive: {
    color: colors.primary,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 13,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  attachBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  attachText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  attachTextActive: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  successBox: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    margin: 16,
    borderWidth: 1,
    borderColor: colors.success,
    gap: 12,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  successSub: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
