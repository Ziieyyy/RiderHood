import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Globe, Check, ChevronRight, X } from 'lucide-react-native';
import { useTranslation, LANGUAGE_OPTIONS, SupportedLanguage } from '../i18n';
import { useThemedStyles } from '../context/ThemeContext';
import { DARK_COLORS } from '../constants/theme';

interface LanguageSelectorProps {
  variant?: 'card' | 'compact' | 'inline';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'card' }) => {
  const { language, setLanguage, t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [modalVisible, setModalVisible] = useState(false);

  const currentOption = LANGUAGE_OPTIONS.find(o => o.code === language) || LANGUAGE_OPTIONS[0];

  const handleSelectLanguage = async (code: SupportedLanguage) => {
    await setLanguage(code);
    setModalVisible(false);
  };

  if (variant === 'inline') {
    return (
      <View style={styles.inlineRow}>
        {LANGUAGE_OPTIONS.map((opt) => {
          const isSelected = opt.code === language;
          return (
            <TouchableOpacity
              key={opt.code}
              style={[styles.inlineOptionBtn, isSelected && styles.inlineOptionBtnActive]}
              onPress={() => handleSelectLanguage(opt.code)}
              activeOpacity={0.8}
            >
              <Text style={styles.flagEmoji}>{opt.flag}</Text>
              <Text style={[styles.inlineOptionText, isSelected && styles.inlineOptionTextActive]}>
                {opt.nativeLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={variant === 'compact' ? styles.compactContainer : styles.cardContainer}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.leftGroup}>
          <View style={styles.iconBadge}>
            <Globe color={styles.iconGlobe.color} size={18} />
          </View>
          <View>
            <Text style={styles.labelTitle}>{t('settings.language')}</Text>
            <Text style={styles.labelSub}>
              {currentOption.flag} {currentOption.nativeLabel}
            </Text>
          </View>
        </View>
        <ChevronRight color={styles.chevron.color} size={18} />
      </TouchableOpacity>

      {/* Language Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Globe color={styles.iconGlobe.color} size={20} />
                <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={styles.chevron.color} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              {t('settings.languageDescription')}
            </Text>

            <View style={styles.optionsList}>
              {LANGUAGE_OPTIONS.map((option) => {
                const isSelected = option.code === language;
                return (
                  <TouchableOpacity
                    key={option.code}
                    style={[
                      styles.languageOptionRow,
                      isSelected && styles.languageOptionRowActive,
                    ]}
                    onPress={() => handleSelectLanguage(option.code)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.optionLeft}>
                      <Text style={styles.modalFlag}>{option.flag}</Text>
                      <View>
                        <Text
                          style={[
                            styles.optionNativeName,
                            isSelected && styles.optionNativeNameActive,
                          ]}
                        >
                          {option.nativeLabel}
                        </Text>
                        <Text style={styles.optionEnglishName}>{option.label}</Text>
                      </View>
                    </View>

                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check color="#FFFFFF" size={14} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    cardContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    compactContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    leftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconGlobe: {
      color: colors.primary,
    },
    chevron: {
      color: colors.textMuted,
    },
    labelTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    labelSub: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },
    inlineRow: {
      flexDirection: 'row',
      gap: 8,
    },
    inlineOptionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.surfaceContainer,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inlineOptionBtnActive: {
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)',
      borderColor: colors.primary,
    },
    flagEmoji: {
      fontSize: 14,
    },
    inlineOptionText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    inlineOptionTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15, 23, 42, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 20,
      width: '100%',
      maxWidth: 380,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 12,
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    modalDescription: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    optionsList: {
      gap: 10,
    },
    languageOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    languageOptionRowActive: {
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.1)',
      borderColor: colors.primary,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    modalFlag: {
      fontSize: 22,
    },
    optionNativeName: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    optionNativeNameActive: {
      color: colors.primary,
    },
    optionEnglishName: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 1,
    },
    checkBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
