import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { AppThemeColors } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { X } from 'lucide-react-native';

interface ResponsiveModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: number;
  maxHeightPercent?: number;
  showCloseButton?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * ResponsiveModal
 * On phone: Renders as a bottom sheet with handle.
 * On tablet/desktop: Renders as a centered floating dialog box.
 */
export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 540,
  maxHeightPercent = 85,
  showCloseButton = true,
  style,
}) => {
  const { isPhone } = useResponsive();
  const { height } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isPhone ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.modalWrapper, isPhone ? styles.phoneWrapper : styles.desktopWrapper]}
          >
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  isPhone ? styles.phoneModalContent : styles.desktopModalContent,
                  {
                    maxWidth: isPhone ? '100%' : maxWidth,
                    maxHeight: (height * maxHeightPercent) / 100,
                  },
                  style,
                ]}
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <View style={styles.modalHeader}>
                    <View style={{ flex: 1 }}>
                      {title && <Text style={styles.modalTitle}>{title}</Text>}
                      {subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}
                    </View>
                    {showCloseButton && (
                      <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={onClose}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <X color={colors.textMuted} size={20} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Modal Body */}
                <ScrollView
                  style={styles.scrollBody}
                  contentContainerStyle={styles.scrollBodyContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const createStyles = (colors: AppThemeColors, isDark: boolean) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalWrapper: {
      width: '100%',
    },
    phoneWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    desktopWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.secondaryBackground,
      borderWidth: 1,
      borderColor: colors.borderHighlight,
      overflow: 'hidden',
    },
    phoneModalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      width: '100%',
      paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    },
    desktopModalContent: {
      borderRadius: 20,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 12,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    modalSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surfaceContainer,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    scrollBody: {
      flexGrow: 0,
    },
    scrollBodyContent: {
      padding: 20,
    },
  });
