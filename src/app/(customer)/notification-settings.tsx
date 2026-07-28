import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { Bell, Calendar, Wrench, Tag } from 'lucide-react-native';

export default function NotificationSettingsScreen() {
  const router = useRouter();

  const [bookingConfirmation, setBookingConfirmation] = useState(true);
  const [bookingUpdates, setBookingUpdates] = useState(true);
  const [bookingCancellation, setBookingCancellation] = useState(true);

  const [maintenanceReminders, setMaintenanceReminders] = useState(true);
  const [serviceDue, setServiceDue] = useState(true);

  const [workshopPromotions, setWorkshopPromotions] = useState(false);

  const handleSave = () => {
    Alert.alert('Settings Saved', 'Your notification preferences have been saved ✓');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Notification Settings"
        subtitle="Manage push alerts for bookings, maintenance & deals"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Bookings Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar color={COLORS.primary} size={18} />
            <Text style={styles.cardTitle}>BOOKINGS & APPOINTMENTS</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Booking Confirmations</Text>
              <Text style={styles.switchSub}>Alert when a workshop confirms your slot</Text>
            </View>
            <Switch
              value={bookingConfirmation}
              onValueChange={setBookingConfirmation}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Status Updates</Text>
              <Text style={styles.switchSub}>Alert when service moves to In Progress or Done</Text>
            </View>
            <Switch
              value={bookingUpdates}
              onValueChange={setBookingUpdates}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Cancellation Alerts</Text>
              <Text style={styles.switchSub}>Alert if an appointment is rescheduled or cancelled</Text>
            </View>
            <Switch
              value={bookingCancellation}
              onValueChange={setBookingCancellation}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Maintenance Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Wrench color={COLORS.primary} size={18} />
            <Text style={styles.cardTitle}>MAINTENANCE & CARE</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Maintenance Reminders</Text>
              <Text style={styles.switchSub}>Upcoming oil change and filter alerts</Text>
            </View>
            <Switch
              value={maintenanceReminders}
              onValueChange={setMaintenanceReminders}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Service Due Alerts</Text>
              <Text style={styles.switchSub}>High-priority alerts for overdue items</Text>
            </View>
            <Switch
              value={serviceDue}
              onValueChange={setServiceDue}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Promotions Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Tag color={COLORS.primary} size={18} />
            <Text style={styles.cardTitle}>PROMOTIONS & DEALS</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Workshop Promotions</Text>
              <Text style={styles.switchSub}>Discounts, service packages & local offers</Text>
            </View>
            <Switch
              value={workshopPromotions}
              onValueChange={setWorkshopPromotions}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <CustomButton title="SAVE PREFERENCES" onPress={handleSave} style={{ marginTop: 8 }} />
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
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: COLORS.textMuted,
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
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  switchSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
