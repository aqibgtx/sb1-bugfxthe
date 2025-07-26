import { createClient } from '@supabase/supabase-js';
import { MALAYSIA_TIMEZONE } from './timezone';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Timezone': MALAYSIA_TIMEZONE
    }
  }
});

// Database types matching the actual schema
export interface User {
  id: string;
  role: 'admin' | 'staff' | 'customer';
  email: string;
  temp_key: string;
  approved: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Car {
  id: string;
  brand: string;
  make: string;
  spec?: string;
  tyre_size?: string;
  current_mileage?: number;
  last_service_mi?: number;
  service_interval?: number;
  roadtax_url?: string;
  rental_price: number;
  imei?: string;
  purchase_method?: 'cash' | 'loan' | 'sambung' | 'rental';
  purchase_price?: number;
  loan_amount?: number;
  loan_start_date?: string;
  loan_bank?: string;
  resale_value?: number;
  status: 'available' | 'booked' | 'sold';
  sold_to?: string;
  sale_price?: number;
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: string;
  staff_id?: string;
  customer_id?: string;
  car_id?: string;
  start_date?: string;
  due_date?: string;
  status: 'pending_payment' | 'confirmed' | 'ongoing' | 'completed' | 'cancel_pending' | 'cancelled';
  payment_status?: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
  fees?: any; // jsonb
  handover_photo?: string;
  created_at: string;
  updated_at: string;
  customer?: User;
  staff?: User;
  car?: Car;
}

interface Payment {
  id: string;
  booking_id?: string;
  customer_id?: string;
  method?: 'fpx' | 'card' | 'qr' | 'atome';
  payment_url?: string;
  receipt_url?: string;
  approved: boolean;
  created_at: string;
  updated_at: string;
  booking?: Booking;
}

interface Invoice {
  id: string;
  booking_id?: string;
  url?: string;
  sent_whatsapp: boolean;
  sent_email: boolean;
  created_at: string;
}

interface Approval {
  id: string;
  type?: 'user_registration' | 'payment' | 'cancel_request';
  data?: any; // jsonb
  ref_id?: string;
  staff_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  user_id?: string;
  type?: 'roadtax' | 'service' | 'due_return';
  payload?: any; // jsonb
  sent_via?: 'whatsapp' | 'email';
  sent_at?: string;
  created_at: string;
}

interface DeliveryFee {
  id: string;
  booking_id?: string;
  km_rate?: number;
  km_travelled?: number;
  tol_fee?: number;
  petrol_fee?: number;
  total?: number;
  created_at: string;
}

interface ROIRecord {
  id: string;
  car_id?: string;
  period_start?: string;
  period_end?: string;
  revenue?: number;
  cost_purchase?: number;
  cost_maintenance?: number;
  cost_service?: number;
  cost_fees?: number;
  net_roi?: number;
  created_at: string;
}

interface CancelRequest {
  id: string;
  booking_id?: string;
  staff_id?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}