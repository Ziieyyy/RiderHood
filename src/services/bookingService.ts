import { supabase } from '../lib/supabase';
import type { Booking, BookingStatus, CreateBookingPayload } from '../types/database';

// Valid state transitions for booking status machine
const ALLOWED_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  pending: ['confirmed', 'cancelled', 'rejected'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'no_show'],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: [],
};

// ─── Get bookings for a customer ──────────────────────────────
export async function getCustomerBookings(customerId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      workshop:workshops(id, name, address, cover_image_url, rating),
      motorcycle:motorcycles(id, nickname, brand, model, plate_number),
      booking_services(*)
    `)
    .eq('customer_id', customerId)
    .order('booking_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

// ─── Get bookings for a workshop ─────────────────────────────
export async function getWorkshopBookings(workshopId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:profiles(id, full_name, email, phone, avatar_url),
      motorcycle:motorcycles(id, nickname, brand, model, plate_number, current_mileage),
      booking_services(*)
    `)
    .eq('workshop_id', workshopId)
    .order('booking_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

// ─── Get a single booking ─────────────────────────────────────
export async function getBooking(id: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      workshop:workshops(*),
      motorcycle:motorcycles(*),
      customer:profiles(*),
      booking_services(*)
    `)
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Booking;
}

// ─── Create booking (transactional via RPC) ───────────────────
export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  // 1. Verify target workshop exists and has booking enabled
  const { data: workshop, error: wsErr } = await supabase
    .from('workshops')
    .select('id, name, status, verification_status, booking_enabled, is_partner')
    .eq('id', payload.workshop_id)
    .single();

  if (wsErr || !workshop) {
    throw new Error('Selected workshop could not be found.');
  }

  if (workshop.status !== 'active') {
    throw new Error('This workshop is currently inactive and cannot accept bookings.');
  }

  if (workshop.booking_enabled === false) {
    throw new Error(`Service bookings are unavailable for ${workshop.name}. This is a directory-only listing.`);
  }

  // 2. Validate selected services and verify workshop ownership
  const serviceIds = payload.services.map((s) => s.service_id);
  const { data: servicesData, error: svcError } = await supabase
    .from('services')
    .select('id, name, price, estimated_duration_minutes, workshop_id')
    .in('id', serviceIds);

  if (svcError || !servicesData || servicesData.length !== serviceIds.length) {
    throw new Error('One or more selected services are invalid or no longer available.');
  }

  const invalidSvc = servicesData.find((svc) => svc.workshop_id !== payload.workshop_id);
  if (invalidSvc) {
    throw new Error('Selected service does not belong to the chosen workshop.');
  }

  const subtotal = (servicesData ?? []).reduce((sum, svc) => {
    const item = payload.services.find((s) => s.service_id === svc.id);
    return sum + svc.price * (item?.quantity ?? 1);
  }, 0);

  // Insert booking
  const { data: booking, error: bkError } = await supabase
    .from('bookings')
    .insert({
      customer_id: payload.customer_id,
      workshop_id: payload.workshop_id,
      motorcycle_id: payload.motorcycle_id,
      booking_date: payload.booking_date,
      booking_time: payload.booking_time,
      status: 'pending',
      subtotal,
      discount: 0,
      total_amount: subtotal,
      notes: payload.notes ?? null,
    })
    .select()
    .single();
  if (bkError) throw bkError;

  // Insert booking_services (price snapshots)
  const bookingServices = (servicesData ?? []).map((svc) => {
    const item = payload.services.find((s) => s.service_id === svc.id);
    return {
      booking_id: booking.id,
      service_id: svc.id,
      service_name_snapshot: svc.name,
      price_snapshot: svc.price,
      quantity: item?.quantity ?? 1,
      duration_snapshot: svc.estimated_duration_minutes,
    };
  });

  const { error: bsError } = await supabase.from('booking_services').insert(bookingServices);
  if (bsError) throw bsError;

  // Create customer notification
  await supabase.from('notifications').insert({
    user_id: payload.customer_id,
    type: 'booking',
    title: 'Booking Submitted',
    message: 'Your booking has been submitted and is awaiting workshop confirmation.',
    data: { booking_id: booking.id },
    is_read: false,
  });

  return booking as Booking;
}

// ─── Reschedule booking ───────────────────────────────────────
export async function rescheduleBooking(
  bookingId: string,
  newDate: string,
  newTime: string,
  reason?: string
): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error('Booking not found');

  const { data, error } = await supabase
    .from('bookings')
    .update({
      booking_date: newDate,
      booking_time: newTime,
      notes: reason ? `${booking.notes ? booking.notes + ' | ' : ''}Rescheduled: ${reason}` : booking.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;

  // Notify customer
  await supabase.from('notifications').insert({
    user_id: booking.customer_id,
    type: 'booking',
    title: 'Booking Rescheduled',
    message: `Your booking date has been updated to ${newDate} at ${newTime}.`,
    data: { booking_id: bookingId },
    is_read: false,
  });

  return data as Booking;
}

// ─── Update booking status (enforces state machine) ───────────
export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  actorUserId: string,
): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error('Booking not found');

  const allowed = ALLOWED_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition booking from "${booking.status}" to "${newStatus}"`);
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select()
    .single();
  if (error) throw error;

  // If completed, automatically generate maintenance_records entry per section 36
  if (newStatus === 'completed') {
    try {
      const bike = booking.motorcycle as any;
      const currentMileage = bike?.current_mileage || 0;

      const { data: record, error: recErr } = await supabase.from('maintenance_records').insert({
        customer_id: booking.customer_id,
        motorcycle_id: booking.motorcycle_id,
        workshop_id: booking.workshop_id,
        booking_id: booking.id,
        service_date: booking.booking_date,
        mileage: currentMileage,
        description: `Service completed at workshop: #${booking.id.slice(0, 8)}`,
        total_cost: booking.total_amount,
        mechanic_notes: booking.notes,
      }).select().single();

      if (!recErr && record && booking.booking_services) {
        const items = booking.booking_services.map(bs => ({
          maintenance_record_id: record.id,
          service_id: bs.service_id,
          item_name: bs.service_name_snapshot,
          cost: bs.price_snapshot,
          quantity: bs.quantity,
        }));
        await supabase.from('maintenance_items').insert(items);
      }
    } catch (err) {
      console.warn('Maintenance record auto-creation error:', err);
    }
  }

  // Notify customer about status change
  const messages: Partial<Record<BookingStatus, string>> = {
    confirmed: 'Your booking has been confirmed by the workshop.',
    rejected: 'Your booking was rejected by the workshop.',
    cancelled: 'Your booking has been cancelled.',
    in_progress: 'Your motorcycle service is now in progress.',
    completed: 'Your service has been completed! How was your experience?',
  };

  if (messages[newStatus]) {
    await supabase.from('notifications').insert({
      user_id: booking.customer_id,
      type: 'booking',
      title: `Booking ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      message: messages[newStatus],
      data: { booking_id: bookingId },
      is_read: false,
    });
  }

  return data as Booking;
}

export async function cancelBooking(bookingId: string, actorUserId: string): Promise<Booking> {
  return updateBookingStatus(bookingId, 'cancelled', actorUserId);
}

// ─── Admin: get all bookings ──────────────────────────────────
export async function getAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:profiles(id, full_name, email),
      workshop:workshops(id, name),
      motorcycle:motorcycles(id, nickname, brand, model)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}
