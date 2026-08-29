import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppThemeColors } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  Bell,
  Calendar,
  Wrench,
  Tag,
  ShieldAlert,
} from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [bookingConfirmation, setBookingConfirmation] = useState(true);
  const [bookingUpdates, setBookingUpdates] = useState(true);
  const [bookingCancellation, setBookingCancellation] = useState(true);
  const [maintenanceReminders, setMaintenanceReminders] = useState(true);
  const [serviceDue, setServiceDue] = useState(true);
  const [workshopPromotions, setWorkshopPromotions] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  const handleSave = () => {
    Alert.alert(t('common.success'), t('settings.saveChanges'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('settings.notifications')} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* General Channels */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Bell color={colors.primary} size={18} />
            <Text style={styles.cardTitle}>{t('settings.notifications').toUpperCase()}</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('settings.pushNotifications')}</Text>
              <Text style={styles.switchSub}>{t('settings.pushNotifications')}</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('settings.emailNotifications')}</Text>
              <Text style={styles.switchSub}>{t('settings.emailNotifications')}</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Bookings Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar color={colors.primary} size={18} />
            <Text style={styles.cardTitle}>{t('navigation.bookings').toUpperCase()}</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('notifications.bookingConfirmed')}</Text>
              <Text style={styles.switchSub}>{t('booking.bookingConfirmed')}</Text>
            </View>
            <Switch
              value={bookingConfirmation}
              onValueChange={setBookingConfirmation}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('settings.bookingUpdates')}</Text>
              <Text style={styles.switchSub}>{t('settings.bookingUpdatesDesc')}</Text>
            </View>
            <Switch
              value={bookingUpdates}
              onValueChange={setBookingUpdates}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('booking.bookingCancelled')}</Text>
              <Text style={styles.switchSub}>{t('booking.bookingCancelled')}</Text>
            </View>
            <Switch
              value={bookingCancellation}
              onValueChange={setBookingCancellation}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Maintenance Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Wrench color={colors.primary} size={18} />
            <Text style={styles.cardTitle}>{t('navigation.maintenance').toUpperCase()}</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('settings.serviceReminders')}</Text>
              <Text style={styles.switchSub}>{t('settings.serviceRemindersDesc')}</Text>
            </View>
            <Switch
              value={maintenanceReminders}
              onValueChange={setMaintenanceReminders}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('dashboard.serviceDue')}</Text>
              <Text style={styles.switchSub}>{t('dashboard.serviceReminderDesc')}</Text>
            </View>
            <Switch
              value={serviceDue}
              onValueChange={setServiceDue}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Promotions Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Tag color={colors.primary} size={18} />
            <Text style={styles.cardTitle}>{t('settings.promotionalMessages').toUpperCase()}</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('settings.promotionalMessages')}</Text>
              <Text style={styles.switchSub}>{t('settings.promotionalMessages')}</Text>
            </View>
            <Switch
              value={workshopPromotions}
              onValueChange={setWorkshopPromotions}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldAlert color={colors.primary} size={18} />
            <Text style={styles.cardTitle}>{t('navigation.security').toUpperCase()}</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('security.title')}</Text>
              <Text style={styles.switchSub}>{t('security.securitySettings')}</Text>
            </View>
            <Switch
              value={securityAlerts}
              onValueChange={setSecurityAlerts}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <CustomButton title={t('settings.saveChanges').toUpperCase()} onPress={handleSave} style={{ marginTop: 8 }} />
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
      gap: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    switchLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    switchSub: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
  });
