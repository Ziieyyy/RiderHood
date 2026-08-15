import { supabase } from '../lib/supabase';
import type { Profile, Motorcycle, Booking, MaintenanceRecord } from '../types/database';

export interface WorkshopCustomerSummary {
  customer: Profile;
  motorcycles: Motorcycle[];
  totalBookings: number;
  completedServices: number;
  lastVisit: string | null;
  totalSpent: number;
  bookings: Booking[];
  maintenanceRecords: MaintenanceRecord[];
}

export async function getWorkshopCustomers(workshopId: string): Promise<WorkshopCustomerSummary[]> {
  // Query bookings for this workshop to fetch customer profiles and motorcycles
  const { data: bookingsData, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:profiles!customer_id(*),
      motorcycle:motorcycles!motorcycle_id(*),
      booking_services(*)
    `)
    .eq('workshop_id', workshopId)
    .order('booking_date', { ascending: false });

  if (error) throw error;

  // Group by customer_id
  const customerMap = new Map<string, WorkshopCustomerSummary>();

  for (const bk of bookingsData ?? []) {
    if (!bk.customer || !bk.customer_id) continue;

    const customerId = bk.customer_id;
    let entry = customerMap.get(customerId);

    if (!entry) {
      entry = {
        customer: bk.customer as Profile,
        motorcycles: [],
        totalBookings: 0,
        completedServices: 0,
        lastVisit: null,
        totalSpent: 0,
        bookings: [],
        maintenanceRecords: [],
      };
      customerMap.set(customerId, entry);
    }

    entry.totalBookings += 1;
    entry.bookings.push(bk as Booking);

    if (bk.status === 'completed') {
      entry.completedServices += 1;
      entry.totalSpent += Number(bk.total_amount || 0);
      if (!entry.lastVisit || new Date(bk.booking_date) > new Date(entry.lastVisit)) {
        entry.lastVisit = bk.booking_date;
      }
    }

    if (bk.motorcycle) {
      const exists = entry.motorcycles.some((m) => m.id === bk.motorcycle.id);
      if (!exists) {
        entry.motorcycles.push(bk.motorcycle as Motorcycle);
      }
    }
  }

  // Also fetch maintenance records for this workshop
  const { data: maintData } = await supabase
    .from('maintenance_records')
    .select('*, maintenance_items(*)')
    .eq('workshop_id', workshopId);

  if (maintData) {
    for (const rec of maintData) {
      const entry = customerMap.get(rec.customer_id);
      if (entry) {
        entry.maintenanceRecords.push(rec as MaintenanceRecord);
      }
    }
  }

  return Array.from(customerMap.values()).sort((a, b) => {
    const dateA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
    const dateB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
    return dateB - dateA;
  });
}
