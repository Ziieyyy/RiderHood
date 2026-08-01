import { supabase } from '../lib/supabase';
import type { Expense, ExpenseCategory } from '../types/database';

// ─── Get expenses for a customer ──────────────────────────────
export async function getCustomerExpenses(customerId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('customer_id', customerId)
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Get expenses for a specific motorcycle ───────────────────
export async function getMotorcycleExpenses(motorcycleId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('motorcycle_id', motorcycleId)
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Create expense ──────────────────────────────────────────
export async function createExpense(payload: {
  customer_id: string;
  motorcycle_id?: string;
  booking_id?: string;
  category: ExpenseCategory;
  description?: string;
  amount: number;
  expense_date: string;
}): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Delete expense ──────────────────────────────────────────
export async function deleteExpense(id: string) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Expense analytics for a customer ─────────────────────────
export async function getExpenseAnalytics(customerId: string) {
  const expenses = await getCustomerExpenses(customerId);

  const byCategory: Record<string, number> = {};
  let total = 0;

  for (const exp of expenses) {
    byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    total += exp.amount;
  }

  return {
    total,
    byCategory,
    count: expenses.length,
  };
}
