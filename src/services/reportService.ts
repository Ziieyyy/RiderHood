import { supabase } from '../lib/supabase';

export type ReportTimeframe = 'today' | '7days' | '30days' | '3months' | '6months' | '1year' | 'all';

export interface PopularServiceStat {
  service_name: string;
  count: number;
  revenue: number;
}

export interface InventoryUsageStat {
  part_id: string;
  part_name: string;
  quantity_used: number;
  times_used: number;
}

export interface WorkshopReportMetrics {
  totalRevenue: number;
  completedBookingsCount: number;
  cancelledBookingsCount: number;
  pendingBookingsCount: number;
  averageBookingValue: number;
  uniqueCustomersCount: number;
  popularServices: PopularServiceStat[];
  inventoryUsage: InventoryUsageStat[];
  dailyRevenueChart: { date: string; revenue: number; bookings: number }[];
}

export async function getWorkshopReports(
  workshopId: string,
  timeframe: ReportTimeframe = '30days',
  customStartDate?: string,
  customEndDate?: string
): Promise<WorkshopReportMetrics> {
  const now = new Date();
  let startDate = new Date();

  if (timeframe === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (timeframe === '7days') {
    startDate.setDate(now.getDate() - 7);
  } else if (timeframe === '30days') {
    startDate.setDate(now.getDate() - 30);
  } else if (timeframe === '3months') {
    startDate.setMonth(now.getMonth() - 3);
  } else if (timeframe === '6months') {
    startDate.setMonth(now.getMonth() - 6);
  } else if (timeframe === '1year') {
    startDate.setFullYear(now.getFullYear() - 1);
  } else if (timeframe === 'all') {
    startDate = new Date(2000, 0, 1);
  }

  if (customStartDate) {
    startDate = new Date(customStartDate);
  }

  const startIso = startDate.toISOString().split('T')[0];
  const endIso = customEndDate || now.toISOString().split('T')[0];

  // Fetch bookings in date range
  const { data: bookingsData, error: bkErr } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_services(*)
    `)
    .eq('workshop_id', workshopId)
    .gte('booking_date', startIso)
    .lte('booking_date', endIso);

  if (bkErr) throw bkErr;

  const bookings = bookingsData ?? [];
  const completed = bookings.filter((b) => b.status === 'completed');
  const cancelled = bookings.filter((b) => b.status === 'cancelled' || b.status === 'rejected');
  const pending = bookings.filter((b) => b.status === 'pending');

  const totalRevenue = completed.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const averageBookingValue = completed.length > 0 ? totalRevenue / completed.length : 0;

  const customerSet = new Set(completed.map((b) => b.customer_id));
  const uniqueCustomersCount = customerSet.size;

  // Popular Services aggregation
  const serviceMap = new Map<string, { count: number; revenue: number }>();
  for (const bk of completed) {
    for (const bs of bk.booking_services || []) {
      const name = bs.service_name_snapshot || 'Service';
      const existing = serviceMap.get(name) || { count: 0, revenue: 0 };
      existing.count += bs.quantity || 1;
      existing.revenue += Number(bs.price_snapshot || 0) * (bs.quantity || 1);
      serviceMap.set(name, existing);
    }
  }

  const popularServices: PopularServiceStat[] = Array.from(serviceMap.entries())
    .map(([service_name, stat]) => ({
      service_name,
      count: stat.count,
      revenue: stat.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Inventory usage aggregation
  const { data: invTxData } = await supabase
    .from('inventory_transactions')
    .select('*, part:parts(name)')
    .eq('workshop_id', workshopId)
    .gte('created_at', startDate.toISOString());

  const invMap = new Map<string, { part_name: string; quantity_used: number; times_used: number }>();
  for (const tx of invTxData ?? []) {
    if (tx.type === 'remove' || tx.type === 'service_used' || tx.change_type === 'deduct') {
      const partName = (tx.part as { name: string } | null)?.name || 'Part';
      const existing = invMap.get(tx.part_id) || { part_name: partName, quantity_used: 0, times_used: 0 };
      existing.quantity_used += Math.abs(tx.quantity);
      existing.times_used += 1;
      invMap.set(tx.part_id, existing);
    }
  }

  const inventoryUsage: InventoryUsageStat[] = Array.from(invMap.entries()).map(([part_id, stat]) => ({
    part_id,
    part_name: stat.part_name,
    quantity_used: stat.quantity_used,
    times_used: stat.times_used,
  }));

  // Daily revenue chart grouping
  const dailyMap = new Map<string, { revenue: number; bookings: number }>();
  for (const bk of completed) {
    const d = bk.booking_date;
    const existing = dailyMap.get(d) || { revenue: 0, bookings: 0 };
    existing.revenue += Number(bk.total_amount || 0);
    existing.bookings += 1;
    dailyMap.set(d, existing);
  }

  const dailyRevenueChart = Array.from(dailyMap.entries())
    .map(([date, stat]) => ({
      date,
      revenue: stat.revenue,
      bookings: stat.bookings,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    totalRevenue,
    completedBookingsCount: completed.length,
    cancelledBookingsCount: cancelled.length,
    pendingBookingsCount: pending.length,
    averageBookingValue,
    uniqueCustomersCount,
    popularServices,
    inventoryUsage,
    dailyRevenueChart,
  };
}
