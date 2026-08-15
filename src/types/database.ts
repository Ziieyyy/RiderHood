// ============================================================
// RiderHood – Supabase Database Type Definitions
// Auto-generate with: npx supabase gen types typescript --project-id jmeffczykjgtzaabliwh
// ============================================================

export type UserRole = 'customer' | 'workshop_admin' | 'super_admin';
export type UserStatus = 'active' | 'suspended' | 'pending' | 'deleted';
export type WorkshopVerificationStatus = 'pending' | 'approved' | 'rejected';
export type WorkshopStatus = 'active' | 'suspended' | 'closed';
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'no_show';
export type ReminderStatus = 'upcoming' | 'due' | 'overdue' | 'completed' | 'dismissed';
export type DocumentType =
  | 'Insurance'
  | 'Road Tax'
  | 'Warranty'
  | 'Service Receipt'
  | 'Vehicle Document'
  | 'Other';
export type ExpenseCategory =
  | 'Maintenance'
  | 'Fuel'
  | 'Parts'
  | 'Insurance'
  | 'Road Tax'
  | 'Other';
export type NotificationType =
  | 'booking'
  | 'maintenance'
  | 'workshop'
  | 'system'
  | 'promotion'
  | 'security';
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

// ─── Table Row Types ────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Motorcycle {
  id: string;
  owner_id: string;
  nickname: string;
  brand: string;
  model: string;
  year: number;
  plate_number: string;
  engine_cc: number | null;
  fuel_type: string | null;
  transmission: string | null;
  current_mileage: number;
  engine_oil_type: string | null;
  front_tyre_size: string | null;
  rear_tyre_size: string | null;
  last_service_date?: string | null;
  warranty_expiry_date?: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MotorcyclePhoto {
  id: string;
  motorcycle_id: string;
  owner_id: string;
  photo_url: string;
  file_path: string | null;
  caption: string | null;
  is_main: boolean;
  created_at: string;
}

export interface Workshop {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  rating: number;
  review_count: number;
  opening_time: string | null;
  closing_time: string | null;
  is_open: boolean;
  is_partner: boolean;
  booking_enabled: boolean;
  verification_status: WorkshopVerificationStatus;
  status: WorkshopStatus;
  operating_hours?: string | null;
  google_review_url?: string | null;
  google_place_id?: string | null;
  google_maps_url?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  google_last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  workshop_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  estimated_duration_minutes: number | null;
  is_available: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Part {
  id: string;
  workshop_id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  category: string | null;
  description: string | null;
  price: number;
  stock_quantity: number;
  minimum_stock: number;
  unit: string | null;
  compatibility: string | null;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  unit_price?: number;
  // computed
  stock_status?: StockStatus;
}

export interface Booking {
  id: string;
  customer_id: string;
  workshop_id: string;
  motorcycle_id: string;
  booking_date: string;
  booking_time: string;
  status: BookingStatus;
  subtotal: number;
  discount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  workshop?: Workshop;
  motorcycle?: Motorcycle;
  customer?: Profile;
  booking_services?: BookingService[];
}

export interface BookingService {
  id: string;
  booking_id: string;
  service_id: string;
  service_name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  duration_snapshot: number | null;
}

export interface MaintenanceRecord {
  id: string;
  customer_id: string;
  motorcycle_id: string;
  workshop_id: string | null;
  booking_id: string | null;
  service_date: string;
  mileage: number;
  description: string | null;
  total_cost: number;
  mechanic_notes: string | null;
  created_at: string;
  updated_at: string;
  maintenance_items?: MaintenanceItem[];
}

export interface MaintenanceItem {
  id: string;
  maintenance_record_id: string;
  service_id: string | null;
  item_name: string;
  cost: number;
  quantity: number;
  notes: string | null;
}

export interface MaintenanceReminder {
  id: string;
  motorcycle_id: string;
  customer_id: string;
  type: string;
  title: string;
  description: string | null;
  next_service_mileage: number | null;
  current_mileage: number | null;
  next_service_date: string | null;
  status: ReminderStatus;
  priority: string | null;
  service_category?: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MileageLog {
  id: string;
  motorcycle_id: string;
  previous_mileage: number;
  new_mileage: number;
  source: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  customer_id: string;
  motorcycle_id: string | null;
  booking_id: string | null;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  expense_date: string;
  created_at: string;
}

export interface Document {
  id: string;
  customer_id: string;
  motorcycle_id: string | null;
  title: string;
  type: DocumentType;
  file_path: string;
  file_url: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  customer_id: string;
  workshop_id: string;
  booking_id: string;
  motorcycle_id?: string | null;
  rating: number;
  comment: string | null;
  reply: string | null;
  reply_at: string | null;
  status: string;
  workshop_reply?: string | null;
  created_at: string;
  updated_at: string;
  customer?: Profile;
  photos?: ReviewPhoto[];
}

export interface ReviewPhoto {
  id: string;
  review_id: string;
  photo_url: string;
  file_path: string | null;
  caption: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ─── Supabase Database Generic ───────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      motorcycles: { Row: Motorcycle; Insert: Partial<Motorcycle>; Update: Partial<Motorcycle> };
      workshops: { Row: Workshop; Insert: Partial<Workshop>; Update: Partial<Workshop> };
      services: { Row: Service; Insert: Partial<Service>; Update: Partial<Service> };
      parts: { Row: Part; Insert: Partial<Part>; Update: Partial<Part> };
      bookings: { Row: Booking; Insert: Partial<Booking>; Update: Partial<Booking> };
      booking_services: { Row: BookingService; Insert: Partial<BookingService>; Update: Partial<BookingService> };
      maintenance_records: { Row: MaintenanceRecord; Insert: Partial<MaintenanceRecord>; Update: Partial<MaintenanceRecord> };
      maintenance_items: { Row: MaintenanceItem; Insert: Partial<MaintenanceItem>; Update: Partial<MaintenanceItem> };
      maintenance_reminders: { Row: MaintenanceReminder; Insert: Partial<MaintenanceReminder>; Update: Partial<MaintenanceReminder> };
      mileage_logs: { Row: MileageLog; Insert: Partial<MileageLog>; Update: Partial<MileageLog> };
      expenses: { Row: Expense; Insert: Partial<Expense>; Update: Partial<Expense> };
      documents: { Row: Document; Insert: Partial<Document>; Update: Partial<Document> };
      reviews: { Row: Review; Insert: Partial<Review>; Update: Partial<Review> };
      review_photos: { Row: ReviewPhoto; Insert: Partial<ReviewPhoto>; Update: Partial<ReviewPhoto> };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ─── Insert Payloads ─────────────────────────────────────────

export interface CreateBookingPayload {
  customer_id: string;
  workshop_id: string;
  motorcycle_id: string;
  booking_date: string;
  booking_time: string;
  notes?: string;
  services: { service_id: string; quantity: number }[];
}

export interface UpdateMileagePayload {
  motorcycle_id: string;
  new_mileage: number;
}
