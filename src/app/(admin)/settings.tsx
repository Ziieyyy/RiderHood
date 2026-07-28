import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/theme';
import { ShieldAlert, KeyRound, Smartphone, HardDrive, RefreshCcw } from 'lucide-react-native';

import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react-native';

export default function AdminSettingsScreen() {
  const { logout } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState(true);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContent}>
        
        <Text style={styles.sectionTitle}>SYSTEM OPERATIONS</Text>
        
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.settingIcon}>
                <ShieldAlert color={COLORS.danger} size={18} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Maintenance Mode</Text>
                <Text style={styles.settingDesc}>Block all user access</Text>
              </View>
            </View>
            <Switch 
              value={maintenanceMode} 
              onValueChange={setMaintenanceMode}
              trackColor={{ false: COLORS.surface, true: COLORS.dangerBg }}
              thumbColor={maintenanceMode ? COLORS.danger : COLORS.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.settingIcon}>
                <HardDrive color={COLORS.primary} size={18} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Debug Logging</Text>
                <Text style={styles.settingDesc}>Capture detailed crash reports</Text>
              </View>
            </View>
            <Switch 
              value={debugLogs} 
              onValueChange={setDebugLogs}
              trackColor={{ false: COLORS.surface, true: COLORS.primaryDark }}
              thumbColor={debugLogs ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>SECURITY & API</Text>
        
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
            <View style={styles.settingInfo}>
              <KeyRound color={COLORS.textSecondary} size={18} />
              <Text style={styles.actionTitle}>Manage API Keys</Text>
            </View>
            <Text style={styles.actionValue}>3 Active</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
            <View style={styles.settingInfo}>
              <Smartphone color={COLORS.textSecondary} size={18} />
              <Text style={styles.actionTitle}>Active Devices</Text>
            </View>
            <Text style={styles.actionValue}>Manage</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnDanger} activeOpacity={0.8}>
          <RefreshCcw color={COLORS.danger} size={18} />
          <Text style={styles.btnDangerText}>FORCE RESTART CORE SERVICES</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btnDanger, { backgroundColor: COLORS.surfaceContainer, borderColor: COLORS.dangerBg, marginTop: 12 }]} 
          onPress={logout}
          activeOpacity={0.8}
        >
          <LogOut color={COLORS.danger} size={18} />
          <Text style={styles.btnDangerText}>LOGOUT SUPER ADMIN SESSION</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderHighlight,
    marginLeft: 64,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  actionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionValue: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  btnDanger: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginTop: 24,
    gap: 8,
  },
  btnDangerText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
