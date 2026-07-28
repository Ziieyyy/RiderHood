import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { getPlatformStats, getAllUsers, setUserStatus } from '../../services/adminService';
import { getAllWorkshops, setWorkshopVerification, setWorkshopStatus } from '../../services/workshopService';
import { Header } from '../../components/Header';
import { Users, Building2, Calendar, TrendingUp, RefreshCw, Shield, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<{ totalUsers: number; totalWorkshops: number; totalBookings: number } | null>(null);
  const [pendingWorkshops, setPendingWorkshops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [platformStats, workshops] = await Promise.all([
        getPlatformStats(),
        getAllWorkshops(),
      ]);
      setStats(platformStats);
      setPendingWorkshops(workshops.filter((w: any) => w.verification_status === 'pending'));
    } catch {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (workshopId: string) => {
    setActionLoading(workshopId + '_approve');
    try {
      await setWorkshopVerification(workshopId, 'approved');
      await loadData();
    } catch { /* ignore */ } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (workshopId: string) => {
    setActionLoading(workshopId + '_reject');
    try {
      await setWorkshopVerification(workshopId, 'rejected');
      await loadData();
    } catch { /* ignore */ } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Command Center" subtitle="Super Admin Dashboard" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading platform data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Command Center" subtitle="Super Admin Dashboard" />
        <View style={styles.centered}>
          <RefreshCw color={COLORS.danger} size={40} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Command Center" subtitle={`Welcome, ${user?.full_name}`} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
      >
        {/* Platform Stats */}
        <Text style={styles.sectionTitle}>PLATFORM OVERVIEW</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Users color={COLORS.primary} size={24} />
            <Text style={styles.statValue}>{stats?.totalUsers ?? 0}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Building2 color="#f59e0b" size={24} />
            <Text style={styles.statValue}>{stats?.totalWorkshops ?? 0}</Text>
            <Text style={styles.statLabel}>Workshops</Text>
          </View>
          <View style={styles.statCard}>
            <Calendar color={COLORS.success} size={24} />
            <Text style={styles.statValue}>{stats?.totalBookings ?? 0}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <AlertTriangle color={COLORS.danger} size={24} />
            <Text style={styles.statValue}>{pendingWorkshops.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Pending Workshop Approvals */}
        <Text style={styles.sectionTitle}>PENDING WORKSHOP APPROVALS</Text>
        {pendingWorkshops.length === 0 ? (
          <View style={styles.emptyCard}>
            <CheckCircle2 color={COLORS.success} size={32} />
            <Text style={styles.emptyTitle}>All applications reviewed</Text>
            <Text style={styles.emptyDesc}>No workshop applications are pending approval.</Text>
          </View>
        ) : (
          pendingWorkshops.map(ws => (
            <View key={ws.id} style={styles.workshopCard}>
              <View style={styles.workshopHeader}>
                <Building2 color="#f59e0b" size={20} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.workshopName}>{ws.name}</Text>
                  <Text style={styles.workshopAddr}>{ws.address ?? ws.district ?? 'No address'}</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>PENDING</Text>
                </View>
              </View>
              {ws.phone && <Text style={styles.workshopMeta}>📞 {ws.phone}</Text>}
              {ws.email && <Text style={styles.workshopMeta}>✉️ {ws.email}</Text>}
              <View style={styles.approvalActions}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(ws.id)}
                  disabled={actionLoading !== null}
                  activeOpacity={0.8}
                >
                  {actionLoading === ws.id + '_approve'
                    ? <ActivityIndicator size="small" color="#000" />
                    : <><CheckCircle2 color="#000" size={14} /><Text style={styles.approveBtnText}>Approve</Text></>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(ws.id)}
                  disabled={actionLoading !== null}
                  activeOpacity={0.8}
                >
                  {actionLoading === ws.id + '_reject'
                    ? <ActivityIndicator size="small" color={COLORS.danger} />
                    : <><XCircle color={COLORS.danger} size={14} /><Text style={styles.rejectBtnText}>Reject</Text></>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Shield color={COLORS.danger} size={16} />
          <Text style={styles.logoutText}>Logout Admin Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
  errorDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 16 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: COLORS.surfaceContainer, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 6, alignItems: 'center' },
  statValue: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '900' },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  emptyCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 18, padding: 28, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 8 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  workshopCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#3b2f10', gap: 8 },
  workshopHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  workshopName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  workshopAddr: { color: COLORS.textSecondary, fontSize: 12 },
  workshopMeta: { color: COLORS.textSecondary, fontSize: 12 },
  pendingBadge: { backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#f59e0b' },
  pendingText: { color: '#f59e0b', fontSize: 10, fontWeight: '800' },
  approvalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 12 },
  approveBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.dangerBg, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.danger },
  rejectBtnText: { color: COLORS.danger, fontSize: 13, fontWeight: '800' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.surfaceContainer, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.dangerBg },
  logoutText: { color: COLORS.danger, fontSize: 13, fontWeight: '700' },
});
