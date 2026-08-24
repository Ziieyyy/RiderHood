import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';
import { LAYOUT } from '../../constants/responsive';
import { useResponsive } from '../../hooks/useResponsive';
import { X } from 'lucide-react-native';

interface ResponsiveModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: number;
  maxHeightPercent?: number;
  style?: StyleProp<ViewStyle>;
  showCloseButton?: boolean;
}

/**
 * ResponsiveModal
 * On Phone: Renders as a bottom sheet / compact modal.
 * On Tablet / Desktop: Renders as a centered dialog with backdrop and controlled maxWidth.
 */
export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = LAYOUT.MODAL_MAX_WIDTH,
  maxHeightPercent = 88,
  style,
  showCloseButton = true,
}) => {
  const { isPhone, isDesktop, height } = useResponsive();

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
            style={[
              styles.modalWrapper,
              isPhone ? styles.phoneWrapper : styles.desktopWrapper,
            ]}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
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
                        <X color={COLORS.textMuted} size={20} />
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

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.secondaryBackground,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
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
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollBodyContent: {
    padding: 20,
  },
});
