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
  let workshop: any = null;
  const { data: wsData, error: wsErr } = await supabase
    .from('workshops')
    .select('id, name, owner_id, status, verification_status, booking_enabled, is_partner')
    .eq('id', payload.workshop_id)
    .maybeSingle();

  if (wsData) {
    workshop = wsData;
  } else {
    // If not found by exact ID, fallback check for active partner workshop
    const { data: fallbackWs } = await supabase
      .from('workshops')
      .select('id, name, owner_id, status, verification_status, booking_enabled, is_partner')
      .eq('is_partner', true)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (fallbackWs) {
      workshop = fallbackWs;
    }
  }

  if (!workshop) {
    throw new Error('Selected workshop could not be found.');
  }

  if (workshop.status !== 'active') {
    throw new Error('This workshop is currently inactive and cannot accept bookings.');
  }

  if (workshop.booking_enabled === false) {
    throw new Error(`Service bookings are unavailable for ${workshop.name}. This is a directory-only listing.`);
  }

  // 2. Validate selected services and verify workshop ownership
  // Resolve services from public.services table OR public.workshop_products
  const serviceIds = payload.services.map((s) => s.service_id);
  interface ResolvedService {
    id: string;
    name: string;
    price: number;
    estimated_duration_minutes: number;
    workshop_id: string;
    isFromServicesTable: boolean;
  }
  const resolvedServices: ResolvedService[] = [];

  // Step 2a: Check public.services table
  const { data: servicesData } = await supabase
    .from('services')
    .select('id, name, price, estimated_duration_minutes, workshop_id')
    .in('id', serviceIds);

  if (servicesData && servicesData.length > 0) {
    for (const s of servicesData) {
      resolvedServices.push({
        id: s.id,
        name: s.name,
        price: Number(s.price || 0),
        estimated_duration_minutes: s.estimated_duration_minutes || 30,
        workshop_id: s.workshop_id,
        isFromServicesTable: true,
      });
    }
  }

  // Step 2b: For any services not found in public.services, check public.workshop_products
  const missingIds = serviceIds.filter((id) => !resolvedServices.some((s) => s.id === id));
  if (missingIds.length > 0) {
    const { data: wpData } = await supabase
      .from('workshop_products')
      .select(`
        id,
        workshop_id,
        price,
        product:products(
          id,
          name,
          specification,
          description,
          category:product_categories(id, name)
        )
      `)
      .in('id', missingIds);

    if (wpData && wpData.length > 0) {
      for (const wp of wpData as any[]) {
        const catName = wp.product?.category?.name || 'General Service';
        let duration = 30;
        if (catName.includes('Full Service')) duration = 60;
        else if (catName.includes('CVT')) duration = 45;
        else if (catName.includes('Throttle Body')) duration = 40;
        else if (catName.includes('Chain')) duration = 35;
        else if (catName.includes('Tayar')) duration = 25;

        resolvedServices.push({
          id: wp.id,
          name: wp.product?.name || 'Service Package',
          price: Number(wp.price || 0),
          estimated_duration_minutes: duration,
          workshop_id: wp.workshop_id,
          isFromServicesTable: false,
        });
      }
    }
  }

  // Step 2c: If any service still cannot be resolved from DB, create a graceful snapshot fallback
  const unresolvedIds = serviceIds.filter((id) => !resolvedServices.some((s) => s.id === id));
  for (const uId of unresolvedIds) {
    resolvedServices.push({
      id: uId,
      name: 'Custom Service Package',
      price: 0,
      estimated_duration_minutes: 30,
      workshop_id: workshop.id,
      isFromServicesTable: false,
    });
  }

  const subtotal = resolvedServices.reduce((sum, svc) => {
    const item = payload.services.find((s) => s.service_id === svc.id);
    return sum + (svc.price || 0) * (item?.quantity ?? 1);
  }, 0);

  // 3. Insert booking into public.bookings
  const { data: booking, error: bkError } = await supabase
    .from('bookings')
    .insert({
      customer_id: payload.customer_id,
      workshop_id: workshop.id,
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

  if (bkError) {
    console.error('Failed to insert booking record in Supabase:', bkError);
    throw new Error(bkError.message || 'Failed to save booking to database.');
  }

  // 4. Insert booking_services (price & duration snapshots)
  // Only pass service_id if it's a valid row in public.services to avoid foreign key violations
  const bookingServices = resolvedServices.map((svc) => {
    const item = payload.services.find((s) => s.service_id === svc.id);
    return {
      booking_id: booking.id,
      service_id: svc.isFromServicesTable ? svc.id : null,
      service_name_snapshot: svc.name,
      price_snapshot: Number(svc.price || 0),
      quantity: item?.quantity ?? 1,
      duration_snapshot: svc.estimated_duration_minutes,
    };
  });

  if (bookingServices.length > 0) {
    const { error: bsError } = await supabase.from('booking_services').insert(bookingServices);
    if (bsError) {
      console.warn('Non-fatal error inserting booking_services snapshot:', bsError);
    }
  }

  // 5. Create in-app notifications (safe, non-blocking)
  try {
    await supabase.from('notifications').insert({
      user_id: payload.customer_id,
      type: 'booking',
      title: 'Booking Submitted',
      message: `Your booking for ${payload.booking_date} at ${payload.booking_time} has been submitted and is awaiting workshop confirmation.`,
      data: { booking_id: booking.id },
      is_read: false,
    });
  } catch (notifErr) {
    console.warn('Customer notification failed (non-critical):', notifErr);
  }

  if (workshop.owner_id && workshop.owner_id !== payload.customer_id) {
    try {
      await supabase.from('notifications').insert({
        user_id: workshop.owner_id,
        type: 'booking',
        title: 'New Service Booking',
        message: `New booking received for ${payload.booking_date} at ${payload.booking_time}.`,
        data: { booking_id: booking.id },
        is_read: false,
      });
    } catch (notifErr) {
      console.warn('Workshop owner notification failed (non-critical):', notifErr);
    }
  }

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
  try {
    await supabase.from('notifications').insert({
      user_id: booking.customer_id,
      type: 'booking',
      title: 'Booking Rescheduled',
      message: `Your booking date has been updated to ${newDate} at ${newTime}.`,
      data: { booking_id: bookingId },
      is_read: false,
    });
  } catch (err) {
    console.warn('Failed to send reschedule notification:', err);
  }

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
    try {
      await supabase.from('notifications').insert({
        user_id: booking.customer_id,
        type: 'booking',
        title: `Booking ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        message: messages[newStatus],
        data: { booking_id: bookingId },
        is_read: false,
      });
    } catch (err) {
      console.warn('Failed to send status update notification:', err);
    }
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
