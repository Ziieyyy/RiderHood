import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { Globe, Check, ChevronRight, X } from 'lucide-react-native';
import { useTranslation, LANGUAGE_OPTIONS, SupportedLanguage } from '../i18n';

interface LanguageSelectorProps {
  variant?: 'card' | 'compact' | 'inline';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'card' }) => {
  const { language, setLanguage, t } = useTranslation();
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
            <Globe color={COLORS.primary} size={18} />
          </View>
          <View>
            <Text style={styles.labelTitle}>{t('settings.language')}</Text>
            <Text style={styles.labelSub}>
              {currentOption.flag} {currentOption.nativeLabel}
            </Text>
          </View>
        </View>
        <ChevronRight color={COLORS.textMuted} size={18} />
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
                <Globe color={COLORS.primary} size={20} />
                <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={COLORS.textMuted} size={20} />
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

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  labelSub: {
    color: COLORS.primary,
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
    backgroundColor: COLORS.surfaceContainer,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inlineOptionBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: COLORS.primary,
  },
  flagEmoji: {
    fontSize: 14,
  },
  inlineOptionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  inlineOptionTextActive: {
    color: COLORS.primary,
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
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  modalDescription: {
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  languageOptionRowActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: COLORS.primary,
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
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  optionNativeNameActive: {
    color: COLORS.primary,
  },
  optionEnglishName: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
