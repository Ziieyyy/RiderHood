import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Lock, CheckCircle2, Mail, AlertTriangle, ShieldAlert, Clock, AlertCircle, MailWarning } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

export type PasswordModalMode = 
  | 'wrong_password' 
  | 'password_changed' 
  | 'reset_email_sent'
  | 'account_suspended'
  | 'account_pending'
  | 'email_not_confirmed'
  | 'invalid_email'
  | 'rate_limit'
  | 'general_error';

export interface PasswordSecurityModalProps {
  visible: boolean;
  mode: PasswordModalMode;
  onClose: () => void;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  secondaryButtonText?: string;
  customTitle?: string;
  customMessage?: string;
}

export const PasswordSecurityModal: React.FC<PasswordSecurityModalProps> = ({
  visible,
  mode,
  onClose,
  onAction,
  onSecondaryAction,
  secondaryButtonText,
  customTitle,
  customMessage,
}) => {
  if (!visible) return null;

  const handlePressAction = () => {
    onClose();
    if (onAction) {
      onAction();
    }
  };

  const handleSecondaryAction = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    }
  };

  const renderContent = () => {
    switch (mode) {
      case 'wrong_password':
        return {
          icon: <Lock color={COLORS.danger} size={32} />,
          iconBg: COLORS.dangerBg,
          borderColor: 'rgba(239, 68, 68, 0.4)',
          title: customTitle || 'Incorrect Password',
          message:
            customMessage ||
            'The password you entered is incorrect. Please check your details and try again.',
          buttonText: 'Try Again',
          buttonColor: COLORS.primary,
          buttonTextColor: '#000000',
        };
      case 'password_changed':
        return {
          icon: <CheckCircle2 color={COLORS.success} size={32} />,
          iconBg: COLORS.successBg,
          borderColor: 'rgba(34, 197, 94, 0.4)',
          title: customTitle || 'Password Updated',
          message:
            customMessage || 'Your password has been successfully changed.',
          buttonText: 'Done',
          buttonColor: COLORS.primary,
          buttonTextColor: '#000000',
        };
      case 'reset_email_sent':
        return {
          icon: <Mail color={COLORS.primary} size={32} />,
          iconBg: COLORS.primaryGlow,
          borderColor: 'rgba(255, 122, 0, 0.4)',
          title: customTitle || 'Check Your Email',
          message:
            customMessage ||
            "If an account is associated with this email, you will receive password reset instructions.",
          buttonText: 'OK',
          buttonColor: COLORS.primary,
          buttonTextColor: '#000000',
        };
      case 'account_suspended':
        return {
          icon: <ShieldAlert color={COLORS.danger} size={32} />,
          iconBg: COLORS.dangerBg,
          borderColor: 'rgba(239, 68, 68, 0.4)',
          title: customTitle || 'Account Suspended',
          message:
            customMessage ||
            'Your account has been suspended. Please contact RiderHood support.',
          buttonText: 'Contact Support',
          buttonColor: COLORS.danger,
          buttonTextColor: '#FFFFFF',
        };
      case 'account_pending':
        return {
          icon: <Clock color="#f59e0b" size={32} />,
          iconBg: '#3b2f10',
          borderColor: 'rgba(245, 158, 11, 0.4)',
          title: customTitle || 'Application Pending',
          message:
            customMessage ||
            'Your workshop account is still awaiting approval.',
          buttonText: 'Understood',
          buttonColor: '#f59e0b',
          buttonTextColor: '#000000',
        };
      case 'email_not_confirmed':
        return {
          icon: <MailWarning color={COLORS.primary} size={32} />,
          iconBg: COLORS.primaryGlow,
          borderColor: 'rgba(255, 122, 0, 0.4)',
          title: customTitle || 'Email Confirmation Required',
          message:
            customMessage ||
            'Your email address has not been confirmed yet. Please check your inbox and click the verification link before logging in.',
          buttonText: 'Understood',
          buttonColor: COLORS.primary,
          buttonTextColor: '#000000',
        };
      case 'invalid_email':
        return {
          icon: <AlertCircle color={COLORS.warning} size={32} />,
          iconBg: COLORS.warningBg,
          borderColor: 'rgba(245, 158, 11, 0.4)',
          title: customTitle || 'Invalid Email',
          message: customMessage || 'Please enter a valid email address.',
          buttonText: 'Try Again',
          buttonColor: COLORS.primary,
          buttonTextColor: '#000000',
        };
      case 'rate_limit':
        return {
          icon: <Clock color={COLORS.warning} size={32} />,
          iconBg: COLORS.warningBg,
          borderColor: 'rgba(245, 158, 11, 0.4)',
          title: customTitle || 'Too Many Attempts',
          message:
            customMessage ||
            'Security rate limit reached. Please wait a few moments before trying again.',
          buttonText: 'OK',
          buttonColor: COLORS.primary,
          buttonTextColor: '#000000',
        };
      case 'general_error':
        return {
          icon: <AlertTriangle color={COLORS.danger} size={32} />,
          iconBg: COLORS.dangerBg,
          borderColor: 'rgba(239, 68, 68, 0.4)',
          title: customTitle || 'Authentication Error',
          message:
            customMessage ||
            'An error occurred during authentication. Please try again.',
          buttonText: 'Dismiss',
          buttonColor: COLORS.danger,
          buttonTextColor: '#FFFFFF',
        };
      default:
        return {
          icon: <AlertTriangle color={COLORS.warning} size={32} />,
          iconBg: COLORS.warningBg,
          borderColor: COLORS.border,
          title: customTitle || 'Notice',
          message: customMessage || 'Action completed.',
          buttonText: 'OK',
          buttonColor: COLORS.primary,
          buttonTextColor: '#000000',
        };
    }
  };

  const content = renderContent();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.card, { borderColor: content.borderColor }]}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: content.iconBg }]}>
                {content.icon}
              </View>

              {/* Text Header */}
              <Text style={styles.title}>{content.title}</Text>
              <Text style={styles.message}>{content.message}</Text>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: content.buttonColor }]}
                  activeOpacity={0.8}
                  onPress={handlePressAction}
                >
                  <Text style={[styles.buttonText, { color: content.buttonTextColor }]}>
                    {content.buttonText}
                  </Text>
                </TouchableOpacity>

                {secondaryButtonText && onSecondaryAction ? (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    activeOpacity={0.8}
                    onPress={handleSecondaryAction}
                  >
                    <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
