import { supabase } from '../lib/supabase';
import type { MaintenanceRecord, MaintenanceReminder, ReminderStatus } from '../types/database';

// ─── Maintenance Records ──────────────────────────────────────

export async function getMaintenanceRecords(motorcycleId: string): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from('maintenance_records')
    .select('*, maintenance_items(*)')
    .eq('motorcycle_id', motorcycleId)
    .order('service_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MaintenanceRecord[];
}

export async function createMaintenanceRecord(
  payload: Partial<MaintenanceRecord>,
): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from('maintenance_records')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Reminders ────────────────────────────────────────────────

export async function getReminders(motorcycleId: string): Promise<MaintenanceReminder[]> {
  const { data, error } = await supabase
    .from('maintenance_reminders')
    .select('*')
    .eq('motorcycle_id', motorcycleId)
    .order('next_service_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createReminder(
  payload: Partial<MaintenanceReminder>,
): Promise<MaintenanceReminder> {
  const reminderData = { ...payload };
  if (!reminderData.customer_id && reminderData.motorcycle_id) {
    const { data: bike } = await supabase.from('motorcycles').select('owner_id').eq('id', reminderData.motorcycle_id).single();
    if (bike?.owner_id) {
      reminderData.customer_id = bike.owner_id;
    }
  }
  if (!reminderData.type) {
    reminderData.type = 'service';
  }
  if (reminderData.next_service_date && typeof reminderData.next_service_date === 'string' && !reminderData.next_service_date.trim()) {
    reminderData.next_service_date = null;
  }
  const { data, error } = await supabase
    .from('maintenance_reminders')
    .insert(reminderData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReminderStatus(
  reminderId: string,
  status: ReminderStatus,
): Promise<MaintenanceReminder> {
  const { data, error } = await supabase
    .from('maintenance_reminders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', reminderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Health Score Calculation ─────────────────────────────────
// Calculated from DB; not hardcoded in the UI.
export async function calculateHealthScore(motorcycleId: string): Promise<number> {
  const reminders = await getReminders(motorcycleId);
  if (reminders.length === 0) return 100;

  const weights: Record<ReminderStatus, number> = {
    upcoming: 1.0,
    due: 0.7,
    overdue: 0.3,
    completed: 1.0,
    dismissed: 0.9,
  };

  const totalWeight = reminders.reduce((sum, r) => sum + (weights[r.status] ?? 1), 0);
  const score = Math.round((totalWeight / reminders.length) * 100);
  return Math.min(100, Math.max(0, score));
}

// ─── Delete Reminders & Service Records ──────────────────────
export async function deleteReminder(reminderId: string): Promise<void> {
  const { error } = await supabase.from('maintenance_reminders').delete().eq('id', reminderId);
  if (error) throw error;
}

export async function deleteMaintenanceRecord(recordId: string): Promise<void> {
  const { error } = await supabase.from('maintenance_records').delete().eq('id', recordId);
  if (error) throw error;
}
