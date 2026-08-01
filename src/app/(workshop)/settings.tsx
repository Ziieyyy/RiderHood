import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { Bell, Shield, LogOut, Smartphone } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export default function WorkshopSettingsScreen() {
  const { logout } = useAuth();
  const [autoAccept, setAutoAccept] = React.useState(false);
  const [smsAlerts, setSmsAlerts] = React.useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>WORKSHOP NOTIFICATIONS & AUTOMATION</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Bell color="#f59e0b" size={20} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Instant Booking SMS & Push Alerts</Text>
            <Text style={styles.rowSub}>Notify mechanics when new booking arrives</Text>
          </View>
          <Switch
            value={smsAlerts}
            onValueChange={setSmsAlerts}
            trackColor={{ false: '#374151', true: '#3b2f10' }}
            thumbColor={smsAlerts ? '#f59e0b' : '#9ca3af'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Shield color="#f59e0b" size={20} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Auto-Confirm Booking Requests</Text>
            <Text style={styles.rowSub}>Automatically accept bookings when bay is open</Text>
          </View>
          <Switch
            value={autoAccept}
            onValueChange={setAutoAccept}
            trackColor={{ false: '#374151', true: '#3b2f10' }}
            thumbColor={autoAccept ? '#f59e0b' : '#9ca3af'}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <LogOut color={COLORS.danger} size={18} />
        <Text style={styles.logoutBtnText}>Logout Workshop Admin Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.dangerBg,
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});
