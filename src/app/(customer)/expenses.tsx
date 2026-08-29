import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, DARK_COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  DollarSign,
  Plus,
  Trash2,
  PieChart,
  Calendar,
  Wrench,
  Fuel,
  ShoppingBag,
  Info,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { getCustomerExpenses, createExpense as createDbExpense } from '../../services/expenseService';
import { getMotorcycles } from '../../services/motorcycleService';
import type { ExpenseCategory, Motorcycle } from '../../types/database';
import { useTranslation } from '../../i18n';

export interface RiderExpense {
  id: string;
  customer_id: string;
  motorcycle_id?: string;
  category: 'Maintenance' | 'Parts' | 'Fuel' | 'Insurance' | 'Other';
  description: string;
  amount: number;
  expense_date: string;
  created_at: string;
}

export default function CustomerExpensesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [expenses, setExpenses] = useState<RiderExpense[]>([]);
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Expense Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBikeId, setSelectedBikeId] = useState('');
  const [category, setCategory] = useState<'Maintenance' | 'Parts' | 'Fuel' | 'Insurance' | 'Other'>('Maintenance');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!user?.id) return;
    try {
      const userBikes = await getMotorcycles(user.id);
      setBikes(userBikes);
      if (userBikes.length > 0) setSelectedBikeId(userBikes[0].id);

      // Fetch expenses from DB via expenseService
      const dbExpenses = await getCustomerExpenses(user.id);
      setExpenses((dbExpenses || []) as RiderExpense[]);
    } catch (err) {
      console.log('Expenses fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleSaveExpense = async () => {
    if (!user?.id) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('errors.invalidAmount'), t('errors.invalidAmount'));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('common.required'), t('errors.requiredField'));
      return;
    }

    setSavingExpense(true);
    try {
      const created = await createDbExpense({
        customer_id: user.id,
        motorcycle_id: selectedBikeId || undefined,
        category: category as ExpenseCategory,
        description: description.trim(),
        amount: numAmount,
        expense_date: new Date().toISOString().split('T')[0],
      });

      setExpenses(prev => [created as RiderExpense, ...prev]);
      setShowAddModal(false);
      setDescription('');
      setAmount('');
      Alert.alert(t('common.success'), t('common.save'));
    } catch (err: any) {
      console.error('Expense save error:', err);
      Alert.alert(t('common.error'), t('errors.saveFailed'));
    } finally {
      setSavingExpense(false);
    }
  };

  const totalThisMonth = expenses.reduce((sum, e) => sum + e.amount, 0);
  const maintenanceTotal = expenses.filter(e => e.category === 'Maintenance').reduce((sum, e) => sum + e.amount, 0);
  const partsTotal = expenses.filter(e => e.category === 'Parts').reduce((sum, e) => sum + e.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('expenses.title')}
        subtitle={t('expenses.subtitle')}
        showBack
        rightElement={
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Plus color={COLORS.primary} size={16} />
            <Text style={styles.addBtnText}>{t('expenses.addExpense')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Monthly Summary Banner */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('expenses.monthlyExpenses').toUpperCase()}</Text>
          <Text style={styles.summaryTotalText}>RM {totalThisMonth.toFixed(2)}</Text>

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLabel}>{t('expenses.maintenance').toUpperCase()}</Text>
              <Text style={styles.breakdownVal}>RM {maintenanceTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLabel}>{t('expenses.accessories').toUpperCase()}</Text>
              <Text style={styles.breakdownVal}>RM {partsTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Expense History List */}
        <Text style={styles.sectionTitle}>{t('maintenance.serviceHistory').toUpperCase()} ({expenses.length})</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <DollarSign color={COLORS.textMuted} size={48} />
            <Text style={styles.emptyTitle}>{t('empty.noExpenses').toUpperCase()}</Text>
            <Text style={styles.emptySub}>{t('empty.noExpensesSub')}</Text>
          </View>
        ) : (
          expenses.map(exp => (
            <View key={exp.id} style={styles.expCard}>
              <View style={styles.expIconCircle}>
                {exp.category === 'Maintenance' ? (
                  <Wrench color={COLORS.primary} size={18} />
                ) : exp.category === 'Parts' ? (
                  <ShoppingBag color="#f59e0b" size={18} />
                ) : (
                  <Info color={COLORS.primaryDim} size={18} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.expDesc}>{exp.description}</Text>
                <Text style={styles.expSub}>{exp.category} • {exp.expense_date}</Text>
              </View>

              <Text style={styles.expAmount}>RM {exp.amount.toFixed(2)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('expenses.addExpense')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('expenses.expenseCategory').toUpperCase()}</Text>
              <View style={styles.catChipsRow}>
                {(['Maintenance', 'Parts', 'Fuel', 'Insurance', 'Other'] as const).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, category === c && styles.catChipActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('common.description').toUpperCase()}</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder={t('common.description')}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('expenses.expenseAmount').toUpperCase()}</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            <CustomButton
              title={savingExpense ? t('common.saving') : t('common.save').toUpperCase()}
              onPress={handleSaveExpense}
              disabled={savingExpense}
            />
            <CustomButton title={t('common.cancel').toUpperCase()} variant="secondary" onPress={() => setShowAddModal(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
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
    addBtnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primaryDark,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    addBtnText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    summaryCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.primaryGlow,
      alignItems: 'center',
      gap: 8,
    },
    summaryTitle: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    summaryTotalText: {
      color: colors.primary,
      fontSize: 32,
      fontWeight: '900',
    },
    breakdownRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      width: '100%',
    },
    breakdownBox: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    breakdownLabel: {
      color: colors.textMuted,
      fontSize: 8,
      fontWeight: '800',
    },
    breakdownVal: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 2,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginTop: 6,
    },
    emptyCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    emptySub: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
    },
    expCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    expIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    expDesc: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    expSub: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    expAmount: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 24,
      padding: 20,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.primary,
      gap: 14,
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
    },
    inputGroup: {
      gap: 6,
    },
    inputLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
    },
    catChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    catChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catChipActive: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primary,
    },
    catChipText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
    },
    catChipTextActive: {
      color: colors.primary,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 46,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 14,
    },
  });
