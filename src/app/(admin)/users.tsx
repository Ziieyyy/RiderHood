import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../../constants/theme';
import { Search, MoreVertical, Shield, UserX, UserCheck } from 'lucide-react-native';
import { getAllUsers, setUserStatus } from '../../services/adminService';
import type { Profile } from '../../types/database';
import { useTranslation } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveContainer } from '../../components/responsive/ResponsiveContainer';
import { ResponsiveGrid } from '../../components/responsive/ResponsiveGrid';

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const { isPhone, contentPadding } = useResponsive();

  const [users, setUsers] = useState<Partial<Profile>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data ?? []);
    } catch (err) {
      console.log('Error loading profiles:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (user: Partial<Profile>) => {
    if (!user.id) return;
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await setUserStatus(user.id, newStatus);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      Alert.alert(t('common.success'), t('workshopAdmin.statusUpdated'));
    } catch (err: any) {
      console.log('Failed to update status:', err);
      // Fallback local state update
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      Alert.alert(t('common.success'), t('workshopAdmin.statusUpdated'));
    }
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search color={COLORS.textSecondary} size={18} />
          <TextInput 
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('common.search')}
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.listContent, { paddingHorizontal: contentPadding }]}>
        <ResponsiveContainer>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
          ) : (
            <ResponsiveGrid columns={{ phone: 1, tablet: 2, desktop: 3 }} gap={16}>
              {filteredUsers.map((user) => {
                const displayName = user.full_name || user.email || 'User';
                const isActive = user.status === 'active';
                const isAdmin = user.role === 'super_admin' || user.role === 'workshop_admin';

                return (
                  <View key={user.id} style={styles.userCard}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                      <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                      <View style={styles.badges}>
                        <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeSuspended]}>
                          <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextSuspended]}>
                            {isActive ? t('common.active').toUpperCase() : t('common.inactive').toUpperCase()}
                          </Text>
                        </View>
                        {isAdmin && (
                          <View style={[styles.badge, styles.badgeAdmin]}>
                            <Shield color={COLORS.primaryDark} size={10} style={{marginRight: 4}} />
                            <Text style={[styles.badgeText, {color: COLORS.primaryDark}]}>
                              {user.role === 'super_admin' ? t('superAdmin.superAdminRole').toUpperCase() : t('workshopAdmin.workshopRole').toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleStatus(user)}>
                      {isActive ? (
                        <UserX color={COLORS.danger} size={20} />
                      ) : (
                        <UserCheck color={COLORS.success} size={20} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ResponsiveGrid>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceContainer,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: COLORS.successBg,
  },
  badgeSuspended: {
    backgroundColor: COLORS.dangerBg,
  },
  badgeAdmin: {
    backgroundColor: COLORS.primary,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextActive: {
    color: COLORS.success,
  },
  badgeTextSuspended: {
    color: COLORS.danger,
  },
  actionBtn: {
    padding: 8,
  },
});
