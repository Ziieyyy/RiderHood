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
import { COLORS } from '../../constants/theme';
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
import { getCustomerExpenses, createExpense as createDbExpense } from '../../services/expenseService';
import { getMotorcycles } from '../../services/motorcycleService';
import type { ExpenseCategory, Motorcycle } from '../../types/database';

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
  const router = useRouter();
  const { user } = useAuth();

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
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please enter a description for this expense.');
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
      Alert.alert('Saved', 'Expense record saved to database successfully.');
    } catch (err: any) {
      console.error('Expense save error:', err);
      Alert.alert('Error', 'Unable to save expense. Please try again.');
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
        title="Motorcycle Expenses"
        subtitle="Track total expenditure on service, parts & fuel"
        showBack
        rightElement={
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Plus color={COLORS.primary} size={16} />
            <Text style={styles.addBtnText}>+ Add Expense</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Monthly Summary Banner */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>TOTAL SPENT THIS MONTH</Text>
          <Text style={styles.summaryTotalText}>RM {totalThisMonth.toFixed(2)}</Text>

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLabel}>MAINTENANCE</Text>
              <Text style={styles.breakdownVal}>RM {maintenanceTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLabel}>PARTS & ACCESSORIES</Text>
              <Text style={styles.breakdownVal}>RM {partsTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Expense History List */}
        <Text style={styles.sectionTitle}>EXPENSE HISTORY ({expenses.length})</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <DollarSign color={COLORS.textMuted} size={48} />
            <Text style={styles.emptyTitle}>NO EXPENSES LOGGED</Text>
            <Text style={styles.emptySub}>Add your service receipts and part purchases to track cost of ownership.</Text>
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
            <Text style={styles.modalTitle}>Add Motorcycle Expense</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CATEGORY</Text>
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
              <Text style={styles.inputLabel}>DESCRIPTION</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Engine Oil, Front Tyre, Brake Fluid"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>AMOUNT (RM)</Text>
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
              title={savingExpense ? 'SAVING...' : 'SAVE EXPENSE'}
              onPress={handleSaveExpense}
              disabled={savingExpense}
            />
            <CustomButton title="CANCEL" variant="secondary" onPress={() => setShowAddModal(false)} />
          </View>
        </View>
      </Modal>
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
  addBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  summaryTotalText: {
    color: COLORS.primary,
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
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  breakdownLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  breakdownVal: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  expCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  expIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expDesc: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  expSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  expAmount: {
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 14,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  catChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  catChipTextActive: {
    color: COLORS.primary,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
  },
});
