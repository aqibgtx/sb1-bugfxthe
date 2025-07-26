-- =====================================================
-- BUDGET PLUS RENTAL - COMPLETE DATABASE EXPORT
-- =====================================================
-- This export includes all schemas, tables, data, functions, triggers, policies, and configurations
-- Generated for seamless migration to another Supabase account

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. CUSTOM TYPES (ENUMS)
-- =====================================================

-- Registration status enum
CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected');

-- Stripe subscription status enum
CREATE TYPE stripe_subscription_status AS ENUM (
    'not_started',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
);

-- Stripe order status enum
CREATE TYPE stripe_order_status AS ENUM (
    'pending',
    'completed',
    'canceled'
);

-- Payment completion status enum
CREATE TYPE payment_completion_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'expired');

-- Admin approval status enum
CREATE TYPE admin_approval_status AS ENUM ('pending', 'approved', 'rejected');

-- =====================================================
-- 3. CORE TABLES
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  ic_number text,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female')),
  role text NOT NULL CHECK (role IN ('admin', 'staff', 'customer')) DEFAULT 'customer',
  approved boolean DEFAULT false,
  active boolean DEFAULT true,
  address_street text,
  address_city text,
  address_state text,
  address_postal_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  temp_key text,
  referred_by uuid REFERENCES users(id),
  registration_status registration_status DEFAULT 'pending',
  staff_type text CHECK (staff_type IN ('field_staff', 'marketing', 'database_registration', 'accounting', 'supervisor', 'director')) DEFAULT 'field_staff'
);

-- Cars table
CREATE TABLE IF NOT EXISTS cars (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand text NOT NULL,
  make text NOT NULL,
  spec text,
  tyre_size text,
  current_mileage integer DEFAULT 0,
  last_service_mileage integer DEFAULT 0,
  service_interval integer DEFAULT 5000,
  rental_price_daily decimal(10,2) NOT NULL,
  imei text,
  purchase_method text CHECK (purchase_method IN ('cash', 'loan')) DEFAULT 'cash',
  purchase_price decimal(10,2) NOT NULL,
  loan_amount decimal(10,2) DEFAULT 0,
  status text CHECK (status IN ('available', 'rented', 'maintenance', 'sold')) DEFAULT 'available',
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  plate_number text NOT NULL UNIQUE
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add-ons table
CREATE TABLE IF NOT EXISTS add_ons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  price_daily decimal(10,2) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES users(id) NOT NULL,
  staff_id uuid REFERENCES users(id) NOT NULL,
  car_id uuid REFERENCES cars(id) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer NOT NULL,
  rental_amount decimal(10,2) NOT NULL,
  add_ons_amount decimal(10,2) DEFAULT 0,
  delivery_fee decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  payment_status text CHECK (payment_status IN ('pending', 'payment_completed', 'approved', 'completed', 'cancelled', 'refunded', 'rejected')) DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  booking_status text CHECK (booking_status IN ('pending_approval', 'approved', 'handed_over', 'ongoing', 'completed', 'cancel_pending', 'cancelled')) DEFAULT 'pending_approval',
  car_name text,
  car_plate_number text,
  is_agent_booking boolean DEFAULT false,
  custom_price_requested decimal(10,2),
  agent_notes text,
  booking_for text CHECK (booking_for IN ('myself', 'someone_else')) DEFAULT 'myself',
  delivery_type text CHECK (delivery_type IN ('self_pickup', 'free_pickup', 'vip_delivery')) DEFAULT 'self_pickup',
  delivery_distance integer DEFAULT 0,
  requires_deposit boolean DEFAULT false,
  return_marked boolean DEFAULT false,
  return_photo_url text,
  actual_return_time timestamptz,
  late_fee decimal(10,2) DEFAULT 0,
  handover_marked boolean DEFAULT false,
  handover_photo_url text,
  handover_time timestamptz,
  handover_by uuid REFERENCES users(id),
  returned_by uuid REFERENCES users(id),
  delivery_enabled boolean DEFAULT false
);

-- Booking add-ons junction table
CREATE TABLE IF NOT EXISTS booking_add_ons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  add_on_id uuid REFERENCES add_ons(id),
  quantity integer DEFAULT 1,
  price_daily decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) NOT NULL UNIQUE,
  payment_method_id uuid REFERENCES payment_methods(id),
  amount decimal(10,2) NOT NULL,
  payment_method_code text NOT NULL,
  receipt_url text,
  payment_url text,
  approved boolean DEFAULT false,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  stripe_session_id text,
  stripe_payment_intent_id text,
  payment_received_at timestamptz,
  payment_details jsonb,
  payment_completion_status payment_completion_status DEFAULT 'pending',
  stripe_webhook_received_at timestamptz,
  stripe_webhook_data jsonb,
  admin_approval_status admin_approval_status DEFAULT 'pending',
  car_name text,
  car_plate_number text,
  is_agent_booking boolean DEFAULT false,
  custom_price_requested decimal(10,2),
  agent_notes text
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('driving_license', 'ic_passport', 'payment_receipt', 'other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_at timestamptz DEFAULT now()
);

-- Sold cars table
CREATE TABLE IF NOT EXISTS sold_cars (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id uuid REFERENCES cars(id) NOT NULL,
  sold_to text NOT NULL,
  sale_price decimal(10,2) NOT NULL,
  sold_date date NOT NULL,
  years_owned decimal(3,1),
  total_rental_revenue decimal(10,2) DEFAULT 0,
  roi_percentage decimal(5,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Delivery details table
CREATE TABLE IF NOT EXISTS delivery_details (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  delivery_address text NOT NULL,
  pickup_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. CAR MANAGEMENT TABLES
-- =====================================================

-- Service Records Table
CREATE TABLE IF NOT EXISTS service_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id uuid REFERENCES cars(id) ON DELETE CASCADE NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('engine_oil', 'gearbox_oil', 'general_service', 'repair')),
  service_date date NOT NULL,
  mileage integer NOT NULL,
  cost decimal(10,2) NOT NULL,
  description text NOT NULL,
  service_provider text NOT NULL,
  receipt_url text,
  next_service_due integer,
  created_at timestamptz DEFAULT now()
);

-- Acquisition Details Table
CREATE TABLE IF NOT EXISTS acquisition_details (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id uuid REFERENCES cars(id) ON DELETE CASCADE NOT NULL,
  purchase_method text NOT NULL CHECK (purchase_method IN ('cash', 'loan', 'sambung_bayar', 'rental')),
  purchase_price decimal(10,2) NOT NULL,
  initial_payment decimal(10,2),
  monthly_installment decimal(10,2),
  payment_schedule jsonb,
  bank_name text,
  bank_account text,
  loan_start_date date,
  loan_duration_months integer,
  company_info jsonb,
  rental_rate_daily decimal(10,2),
  rental_rate_monthly decimal(10,2),
  rental_duration integer,
  selling_price decimal(10,2),
  roi_percentage decimal(5,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Maintenance Records Table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id uuid REFERENCES cars(id) ON DELETE CASCADE NOT NULL,
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('repair', 'replacement', 'inspection', 'cleaning', 'other')),
  date date NOT NULL,
  cost decimal(10,2) NOT NULL,
  description text NOT NULL,
  service_provider text NOT NULL,
  parts_replaced text,
  labor_hours decimal(4,2),
  warranty_period integer,
  receipt_photos text[],
  condition_before text NOT NULL,
  condition_after text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Car Documents Table
CREATE TABLE IF NOT EXISTS car_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id uuid REFERENCES cars(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('road_tax', 'insurance', 'service_receipt', 'repair_invoice', 'inspection_report', 'other')),
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  expiry_date date,
  notes text,
  uploaded_at timestamptz DEFAULT now()
);

-- Payment Reminders Table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id uuid REFERENCES cars(id) ON DELETE CASCADE NOT NULL,
  due_date date NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('loan', 'sambung_bayar', 'rental', 'insurance', 'road_tax')),
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
  reminder_sent boolean DEFAULT false,
  reminder_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. STAFF MANAGEMENT TABLES
-- =====================================================

-- Payroll Adjustments Table
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('bonus', 'deduction', 'commission', 'overtime', 'penalty', 'allowance')),
  category text NOT NULL CHECK (category IN ('manual_sales_commission', 'performance_bonus', 'late_penalty', 'holiday_penalty', 'absence_penalty', 'red_flag_penalty', 'saman_accident', 'overtime_pay', 'other')),
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  reference_id uuid,
  pay_period_month text NOT NULL,
  created_by uuid REFERENCES users(id) NOT NULL,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'paid')) DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  total_hours decimal(4,2) DEFAULT 0,
  regular_hours decimal(4,2) DEFAULT 0,
  overtime_hours decimal(4,2) DEFAULT 0,
  status text CHECK (status IN ('present', 'absent', 'late', 'half_day', 'sick_leave', 'annual_leave', 'unauthorized_leave')) DEFAULT 'present',
  late_minutes integer DEFAULT 0,
  early_departure_minutes integer DEFAULT 0,
  notes text,
  recorded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, date)
);

-- Red Flag Incidents Table
CREATE TABLE IF NOT EXISTS red_flag_incidents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  incident_type text NOT NULL CHECK (incident_type IN ('customer_complaint', 'vehicle_damage', 'policy_violation', 'attendance_issue', 'performance_issue', 'safety_violation', 'other')),
  severity text NOT NULL CHECK (severity IN ('minor', 'major', 'critical')) DEFAULT 'minor',
  title text NOT NULL,
  description text NOT NULL,
  incident_date date NOT NULL,
  penalty_amount decimal(10,2) DEFAULT 100.00,
  status text CHECK (status IN ('active', 'resolved', 'dismissed')) DEFAULT 'active',
  resolution_notes text,
  reported_by uuid REFERENCES users(id) NOT NULL,
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  reference_booking_id uuid REFERENCES bookings(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Staff Performance Metrics Table
CREATE TABLE IF NOT EXISTS staff_performance_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  month_year text NOT NULL,
  total_bookings integer DEFAULT 0,
  total_delivery_km decimal(10,2) DEFAULT 0,
  total_referrals integer DEFAULT 0,
  attendance_days integer DEFAULT 0,
  absent_days integer DEFAULT 0,
  late_occurrences integer DEFAULT 0,
  overtime_hours decimal(4,2) DEFAULT 0,
  red_flags_count integer DEFAULT 0,
  customer_rating decimal(3,2) DEFAULT 0,
  performance_score decimal(5,2) DEFAULT 0,
  basic_salary decimal(10,2) NOT NULL,
  total_earnings decimal(10,2) DEFAULT 0,
  total_deductions decimal(10,2) DEFAULT 0,
  net_payout decimal(10,2) DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, month_year)
);

-- =====================================================
-- 6. HANDOVER AND TRACKING TABLES
-- =====================================================

-- Handover Logs Table
CREATE TABLE IF NOT EXISTS handover_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('handover', 'return')),
  performed_by uuid REFERENCES users(id) NOT NULL,
  photo_url text,
  action_time timestamptz NOT NULL,
  late_fee_calculated decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Return Logs Table
CREATE TABLE IF NOT EXISTS return_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  marked_by uuid REFERENCES users(id) NOT NULL,
  return_photo_url text,
  actual_return_time timestamptz NOT NULL,
  late_fee_calculated decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 7. CANCELLATION AND EXTENSION TABLES
-- =====================================================

-- Cancellation Requests Table
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  staff_id uuid REFERENCES users(id) NOT NULL,
  reason text NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Booking Extensions Table
CREATE TABLE IF NOT EXISTS booking_extensions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  original_end_date date NOT NULL,
  extended_end_date date NOT NULL,
  extension_days integer NOT NULL,
  daily_rate decimal(10,2) NOT NULL,
  extension_amount decimal(10,2) NOT NULL,
  payment_status text CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
  payment_due_date date NOT NULL,
  created_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Overdue Alerts Table
CREATE TABLE IF NOT EXISTS overdue_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES users(id) NOT NULL,
  alert_type text CHECK (alert_type IN ('payment_overdue', 'return_overdue', 'extension_required')) NOT NULL,
  severity text CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'warning',
  title text NOT NULL,
  message text NOT NULL,
  days_overdue integer DEFAULT 0,
  amount_due decimal(10,2) DEFAULT 0,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 8. INVOICE AND TERMS TABLES
-- =====================================================

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  invoice_number text UNIQUE NOT NULL,
  html_content text,
  amount decimal(10,2) NOT NULL,
  status text CHECK (status IN ('generated', 'sent', 'paid', 'cancelled')) DEFAULT 'generated',
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Terms and Conditions Table
CREATE TABLE IF NOT EXISTS terms_and_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  version text NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- =====================================================
-- 9. STRIPE INTEGRATION TABLES
-- =====================================================

-- Stripe Customers Table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id) not null unique,
  customer_id text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

-- Stripe Subscriptions Table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint primary key generated always as identity,
  customer_id text unique not null,
  subscription_id text default null,
  price_id text default null,
  current_period_start bigint default null,
  current_period_end bigint default null,
  cancel_at_period_end boolean default false,
  payment_method_brand text default null,
  payment_method_last4 text default null,
  status stripe_subscription_status not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

-- Stripe Orders Table
CREATE TABLE IF NOT EXISTS stripe_orders (
    id bigint primary key generated always as identity,
    checkout_session_id text not null,
    payment_intent_id text not null,
    customer_id text not null,
    amount_subtotal bigint not null,
    amount_total bigint not null,
    currency text not null,
    payment_status text not null,
    status stripe_order_status not null default 'pending',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    deleted_at timestamp with time zone default null
);

-- =====================================================
-- 10. INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_registration_status ON users(registration_status);

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_actual_return_time ON bookings(actual_return_time);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_for ON bookings(booking_for);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_car_name ON bookings(car_name);
CREATE INDEX IF NOT EXISTS idx_bookings_car_plate_number ON bookings(car_plate_number);
CREATE INDEX IF NOT EXISTS idx_bookings_combined_status ON bookings(booking_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_distance ON bookings(delivery_distance);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_enabled ON bookings(delivery_enabled);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_type ON bookings(delivery_type);
CREATE INDEX IF NOT EXISTS idx_bookings_handover_by ON bookings(handover_by);
CREATE INDEX IF NOT EXISTS idx_bookings_handover_marked ON bookings(handover_marked);
CREATE INDEX IF NOT EXISTS idx_bookings_handover_time ON bookings(handover_time);
CREATE INDEX IF NOT EXISTS idx_bookings_is_agent_booking ON bookings(is_agent_booking);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_requires_deposit ON bookings(requires_deposit);
CREATE INDEX IF NOT EXISTS idx_bookings_return_marked ON bookings(return_marked);
CREATE INDEX IF NOT EXISTS idx_bookings_returned_by ON bookings(returned_by);

-- Cars table indexes
CREATE INDEX IF NOT EXISTS idx_cars_plate_number ON cars(plate_number);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_admin_approval ON payments(admin_approval_status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id_unique ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_car_name ON payments(car_name);
CREATE INDEX IF NOT EXISTS idx_payments_car_plate_number ON payments(car_plate_number);
CREATE INDEX IF NOT EXISTS idx_payments_completion_status ON payments(payment_completion_status);
CREATE INDEX IF NOT EXISTS idx_payments_is_agent_booking ON payments(is_agent_booking);
CREATE INDEX IF NOT EXISTS idx_payments_payment_received_at ON payments(payment_received_at);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id ON payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_webhook_received ON payments(stripe_webhook_received_at);

-- Handover logs indexes
CREATE INDEX IF NOT EXISTS idx_handover_logs_action_type ON handover_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_handover_logs_booking_id ON handover_logs(booking_id);

-- Red flag incidents indexes
CREATE INDEX IF NOT EXISTS idx_red_flag_incidents_date ON red_flag_incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_red_flag_incidents_severity ON red_flag_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_red_flag_incidents_staff ON red_flag_incidents(staff_id);
CREATE INDEX IF NOT EXISTS idx_red_flag_incidents_status ON red_flag_incidents(status);

-- Staff performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_staff_performance_metrics_staff_month ON staff_performance_metrics(staff_id, month_year);

-- Payroll adjustments indexes
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_category ON payroll_adjustments(category);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_staff_month ON payroll_adjustments(staff_id, pay_period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_status ON payroll_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_type ON payroll_adjustments(adjustment_type);

-- Attendance records indexes
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_date ON attendance_records(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);

-- Cancellation requests indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_booking_id ON cancellation_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_booking_staff ON cancellation_requests(booking_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON cancellation_requests(status);

-- Booking extensions indexes
CREATE INDEX IF NOT EXISTS idx_booking_extensions_booking_id ON booking_extensions(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_extensions_payment_status ON booking_extensions(payment_status);

-- Overdue alerts indexes
CREATE INDEX IF NOT EXISTS idx_overdue_alerts_booking_id ON overdue_alerts(booking_id);
CREATE INDEX IF NOT EXISTS idx_overdue_alerts_customer_id ON overdue_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_overdue_alerts_resolved ON overdue_alerts(resolved);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Return logs indexes
CREATE INDEX IF NOT EXISTS idx_return_logs_booking_id ON return_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_return_logs_marked_by ON return_logs(marked_by);

-- =====================================================
-- 11. UTILITY FUNCTIONS
-- =====================================================

-- Function for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate booking numbers
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_number = 'BK' || LPAD(nextval('booking_number_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate next service due
CREATE OR REPLACE FUNCTION calculate_next_service_due()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_service_due = NEW.mileage + 5000;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create payment reminders for loans
CREATE OR REPLACE FUNCTION create_payment_reminders()
RETURNS TRIGGER AS $$
DECLARE
  reminder_date date;
  i integer;
BEGIN
  IF NEW.purchase_method IN ('loan', 'sambung_bayar') AND NEW.monthly_installment > 0 AND NEW.loan_duration_months > 0 THEN
    FOR i IN 1..NEW.loan_duration_months LOOP
      reminder_date := NEW.loan_start_date + (i || ' months')::interval;
      
      INSERT INTO payment_reminders (
        car_id,
        due_date,
        amount,
        payment_type,
        notes
      ) VALUES (
        NEW.car_id,
        reminder_date,
        NEW.monthly_installment,
        NEW.purchase_method,
        'Monthly installment payment'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to populate booking car info
CREATE OR REPLACE FUNCTION populate_booking_car_info()
RETURNS TRIGGER AS $$
DECLARE
  car_info RECORD;
BEGIN
  SELECT 
    CONCAT(c.brand, ' ', c.make, CASE WHEN c.spec IS NOT NULL THEN CONCAT(' ', c.spec) ELSE '' END) as car_name,
    c.plate_number as car_plate_number
  INTO car_info
  FROM cars c
  WHERE c.id = NEW.car_id;
  
  NEW.car_name = car_info.car_name;
  NEW.car_plate_number = car_info.car_plate_number;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to populate payment car info
CREATE OR REPLACE FUNCTION populate_payment_car_info()
RETURNS TRIGGER AS $$
DECLARE
  car_info RECORD;
  booking_car_id uuid;
BEGIN
  SELECT car_id INTO booking_car_id
  FROM bookings
  WHERE id = NEW.booking_id;
  
  SELECT 
    CONCAT(c.brand, ' ', c.make, CASE WHEN c.spec IS NOT NULL THEN CONCAT(' ', c.spec) ELSE '' END) as car_name,
    c.plate_number as car_plate_number
  INTO car_info
  FROM cars c
  WHERE c.id = booking_car_id;
  
  NEW.car_name = car_info.car_name;
  NEW.car_plate_number = car_info.car_plate_number;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update car status from booking
CREATE OR REPLACE FUNCTION update_car_status_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.return_marked = true AND (OLD.return_marked IS NULL OR OLD.return_marked = false) THEN
      UPDATE cars SET status = 'available' WHERE id = NEW.car_id;
      
      IF NEW.payment_status = 'approved' THEN
        NEW.booking_status = 'completed';
        NEW.payment_status = 'completed';
      END IF;
      
    ELSIF NEW.booking_status = 'approved' AND (OLD.booking_status IS NULL OR OLD.booking_status != 'approved') THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
      
    ELSIF NEW.booking_status IN ('cancelled', 'completed') AND OLD.booking_status NOT IN ('cancelled', 'completed') THEN
      UPDATE cars SET status = 'available' 
      WHERE id = NEW.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = NEW.car_id 
        AND booking_status IN ('approved', 'handed_over', 'ongoing')
        AND return_marked = false
        AND id != NEW.id
      );
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    IF OLD.booking_status IN ('approved', 'handed_over', 'ongoing') AND OLD.return_marked = false THEN
      UPDATE cars SET status = 'available' 
      WHERE id = OLD.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = OLD.car_id 
        AND booking_status IN ('approved', 'handed_over', 'ongoing')
        AND return_marked = false
      );
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to handle payment rejection
CREATE OR REPLACE FUNCTION handle_payment_rejection()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE bookings 
    SET 
      payment_status = 'rejected',
      notes = COALESCE(notes, '') || ' | Payment rejected by admin.',
      updated_at = now()
    WHERE id = OLD.booking_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Function to ensure booking payment consistency
CREATE OR REPLACE FUNCTION ensure_booking_payment_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status IN ('rejected', 'cancelled') AND OLD.payment_status NOT IN ('rejected', 'cancelled') THEN
    DELETE FROM payments 
    WHERE booking_id = NEW.id AND approved = false;
  END IF;
  
  IF NEW.booking_status = 'cancelled' AND OLD.booking_status != 'cancelled' THEN
    IF NEW.payment_status NOT IN ('paid', 'completed', 'refunded') THEN
      NEW.payment_status = 'cancelled';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to ensure payment exists for approved bookings
CREATE OR REPLACE FUNCTION ensure_payment_exists_for_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_status = 'approved' AND OLD.booking_status != 'approved' THEN
    IF NOT EXISTS (
      SELECT 1 FROM payments WHERE booking_id = NEW.id
    ) THEN
      INSERT INTO payments (
        booking_id,
        amount,
        payment_method_code,
        payment_completion_status,
        admin_approval_status,
        notes
      ) VALUES (
        NEW.id,
        NEW.total_amount,
        'PENDING',
        'pending',
        'pending',
        'Payment record created automatically when booking was approved'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to handle Stripe payment completion
CREATE OR REPLACE FUNCTION handle_stripe_payment_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_completion_status = 'completed' AND (OLD.payment_completion_status IS NULL OR OLD.payment_completion_status != 'completed') THEN
    UPDATE bookings 
    SET 
      payment_status = 'payment_completed',
      notes = COALESCE(notes, '') || ' | Payment completed via Stripe webhook.',
      updated_at = now()
    WHERE id = NEW.booking_id;
  END IF;
  
  IF NEW.admin_approval_status = 'approved' AND (OLD.admin_approval_status IS NULL OR OLD.admin_approval_status != 'approved') THEN
    UPDATE bookings 
    SET 
      payment_status = 'approved',
      notes = COALESCE(notes, '') || ' | Payment approved by admin.',
      updated_at = now()
    WHERE id = NEW.booking_id;
  END IF;
  
  IF NEW.admin_approval_status = 'rejected' AND (OLD.admin_approval_status IS NULL OR OLD.admin_approval_status != 'rejected') THEN
    UPDATE bookings 
    SET 
      payment_status = 'rejected',
      notes = COALESCE(notes, '') || ' | Payment rejected by admin.',
      updated_at = now()
    WHERE id = NEW.booking_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to log booking payment status changes
CREATE OR REPLACE FUNCTION log_booking_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used for audit logging if needed
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to handle user rejection
CREATE OR REPLACE FUNCTION handle_user_rejection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.registration_status = 'rejected' AND OLD.registration_status != 'rejected' THEN
    NEW.approved = false;
    NEW.active = false;
  END IF;
  
  IF NEW.registration_status = 'approved' AND OLD.registration_status != 'approved' THEN
    NEW.approved = true;
  END IF;
  
  IF NEW.registration_status = 'pending' AND OLD.registration_status != 'pending' THEN
    NEW.approved = false;
    NEW.active = false;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to process approved cancellation
CREATE OR REPLACE FUNCTION process_approved_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE bookings 
    SET 
      booking_status = 'cancelled',
      payment_status = 'cancelled',
      notes = COALESCE(notes, '') || ' | Cancelled by admin approval. Reason: ' || NEW.reason,
      updated_at = now()
    WHERE id = NEW.booking_id;
    
    NEW.approved_by = (SELECT id FROM users WHERE auth_id = auth.uid());
    NEW.approved_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to mark subsequent cancellation
CREATE OR REPLACE FUNCTION mark_subsequent_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  previous_requests integer;
BEGIN
  SELECT COUNT(*)
  INTO previous_requests
  FROM cancellation_requests
  WHERE booking_id = NEW.booking_id 
  AND staff_id = NEW.staff_id
  AND id != NEW.id;
  
  IF previous_requests > 0 THEN
    NEW.reason := '[SUBSEQUENT CANCELLATION] ' || NEW.reason;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate delivery fee
CREATE OR REPLACE FUNCTION update_delivery_fee()
RETURNS TRIGGER AS $$
BEGIN
  NEW.delivery_fee = CASE 
    WHEN NEW.delivery_type = 'self_pickup' THEN 0
    WHEN NEW.delivery_type = 'free_pickup' THEN 
      CASE 
        WHEN NEW.delivery_distance > 7 THEN (NEW.delivery_distance - 7) * 2 
        ELSE 0 
      END
    WHEN NEW.delivery_type = 'vip_delivery' THEN NEW.delivery_distance * 4
    ELSE 0
  END;
  
  NEW.requires_deposit = (NEW.booking_for = 'someone_else' OR NEW.delivery_type = 'vip_delivery');
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Staff management functions
CREATE OR REPLACE FUNCTION calculate_daily_attendance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    NEW.total_hours = EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
    
    IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
      NEW.total_hours = NEW.total_hours - (EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 3600);
    END IF;
    
    IF NEW.total_hours <= 8 THEN
      NEW.regular_hours = NEW.total_hours;
      NEW.overtime_hours = 0;
    ELSE
      NEW.regular_hours = 8;
      NEW.overtime_hours = NEW.total_hours - 8;
    END IF;
    
    IF NEW.clock_in > (DATE(NEW.clock_in) + INTERVAL '9 hours') THEN
      NEW.late_minutes = EXTRACT(EPOCH FROM (NEW.clock_in - (DATE(NEW.clock_in) + INTERVAL '9 hours'))) / 60;
      IF NEW.status = 'present' THEN
        NEW.status = 'late';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION create_red_flag_penalty()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.penalty_amount > 0 THEN
    INSERT INTO payroll_adjustments (
      staff_id,
      adjustment_type,
      category,
      amount,
      description,
      reference_id,
      pay_period_month,
      created_by,
      status
    ) VALUES (
      NEW.staff_id,
      'penalty',
      'red_flag_penalty',
      -NEW.penalty_amount,
      'Red Flag Penalty: ' || NEW.title,
      NEW.id,
      TO_CHAR(NEW.incident_date, 'YYYY-MM'),
      NEW.reported_by,
      'approved'
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION create_overtime_pay()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.overtime_hours > 0 AND (OLD.overtime_hours IS NULL OR OLD.overtime_hours != NEW.overtime_hours) THEN
    IF OLD.overtime_hours IS NOT NULL THEN
      DELETE FROM payroll_adjustments 
      WHERE staff_id = NEW.staff_id 
      AND category = 'overtime_pay' 
      AND reference_id = NEW.id;
    END IF;
    
    INSERT INTO payroll_adjustments (
      staff_id,
      adjustment_type,
      category,
      amount,
      description,
      reference_id,
      pay_period_month,
      created_by,
      status
    ) VALUES (
      NEW.staff_id,
      'overtime',
      'overtime_pay',
      NEW.overtime_hours * 5,
      'Overtime Pay: ' || NEW.overtime_hours || ' hours on ' || NEW.date,
      NEW.id,
      TO_CHAR(NEW.date, 'YYYY-MM'),
      COALESCE(NEW.recorded_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
      'approved'
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION create_late_penalty()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'late' AND NEW.late_minutes > 0 AND (OLD.status IS NULL OR OLD.status != 'late') THEN
    INSERT INTO payroll_adjustments (
      staff_id,
      adjustment_type,
      category,
      amount,
      description,
      reference_id,
      pay_period_month,
      created_by,
      status
    ) VALUES (
      NEW.staff_id,
      'penalty',
      'late_penalty',
      -10,
      'Late Penalty: ' || NEW.late_minutes || ' minutes late on ' || NEW.date,
      NEW.id,
      TO_CHAR(NEW.date, 'YYYY-MM'),
      COALESCE(NEW.recorded_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
      'approved'
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 12. SEQUENCES
-- =====================================================

-- Create sequence for booking numbers
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1;

-- =====================================================
-- 13. TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_details_updated_at BEFORE UPDATE ON delivery_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_acquisition_details_updated_at BEFORE UPDATE ON acquisition_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_reminders_updated_at BEFORE UPDATE ON payment_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_adjustments_updated_at BEFORE UPDATE ON payroll_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_red_flag_incidents_updated_at BEFORE UPDATE ON red_flag_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_performance_metrics_updated_at BEFORE UPDATE ON staff_performance_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cancellation_requests_updated_at BEFORE UPDATE ON cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_extensions_updated_at BEFORE UPDATE ON booking_extensions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Business logic triggers
CREATE TRIGGER generate_booking_number_trigger BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_number();

CREATE TRIGGER calculate_next_service_due_trigger BEFORE INSERT ON service_records
  FOR EACH ROW EXECUTE FUNCTION calculate_next_service_due();

CREATE TRIGGER create_payment_reminders_trigger AFTER INSERT ON acquisition_details
  FOR EACH ROW EXECUTE FUNCTION create_payment_reminders();

CREATE TRIGGER populate_booking_car_info_trigger BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION populate_booking_car_info();

CREATE TRIGGER populate_payment_car_info_trigger BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION populate_payment_car_info();

CREATE TRIGGER update_car_status_trigger AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_car_status_from_booking();

CREATE TRIGGER payment_rejection_trigger AFTER DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION handle_payment_rejection();

CREATE TRIGGER booking_payment_consistency_trigger AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION ensure_booking_payment_consistency();

CREATE TRIGGER ensure_payment_exists_trigger AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.booking_status = 'approved' AND OLD.booking_status != 'approved')
  EXECUTE FUNCTION ensure_payment_exists_for_booking();

CREATE TRIGGER handle_stripe_payment_completion_trigger AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION handle_stripe_payment_completion();

CREATE TRIGGER log_booking_payment_status_change_trigger BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION log_booking_payment_status_change();

CREATE TRIGGER handle_user_rejection_trigger BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION handle_user_rejection();

CREATE TRIGGER process_approved_cancellation_trigger BEFORE UPDATE ON cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION process_approved_cancellation();

CREATE TRIGGER mark_subsequent_cancellation_trigger BEFORE INSERT ON cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION mark_subsequent_cancellation();

CREATE TRIGGER update_delivery_fee_trigger BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.delivery_type IS NOT NULL AND NEW.delivery_distance IS NOT NULL)
  EXECUTE FUNCTION update_delivery_fee();

-- Staff management triggers
CREATE TRIGGER calculate_daily_attendance_trigger BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION calculate_daily_attendance();

CREATE TRIGGER create_red_flag_penalty_trigger AFTER INSERT ON red_flag_incidents
  FOR EACH ROW EXECUTE FUNCTION create_red_flag_penalty();

CREATE TRIGGER create_overtime_pay_trigger AFTER INSERT OR UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION create_overtime_pay();

CREATE TRIGGER create_late_penalty_trigger AFTER INSERT OR UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION create_late_penalty();

-- =====================================================
-- 14. VIEWS
-- =====================================================

-- Stripe user subscriptions view
CREATE OR REPLACE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND s.deleted_at IS NULL;

-- Stripe user orders view
CREATE OR REPLACE VIEW stripe_user_orders WITH (security_invoker) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND o.deleted_at IS NULL;

-- Overdue bookings view
CREATE OR REPLACE VIEW overdue_bookings_view AS
SELECT 
  b.id as booking_id,
  b.booking_number,
  b.customer_id,
  u.name as customer_name,
  u.email as customer_email,
  u.phone as customer_phone,
  b.car_name,
  b.car_plate_number,
  b.end_date as original_end_date,
  CURRENT_DATE - b.end_date as days_overdue,
  (b.rental_amount / b.total_days) as daily_rate,
  (CURRENT_DATE - b.end_date) * (b.rental_amount / b.total_days) as amount_overdue,
  b.payment_status,
  b.return_marked,
  CASE 
    WHEN CURRENT_DATE - b.end_date >= 7 THEN 'critical'
    WHEN CURRENT_DATE - b.end_date >= 3 THEN 'warning'
    ELSE 'info'
  END as severity,
  b.created_at,
  b.updated_at
FROM bookings b
JOIN users u ON b.customer_id = u.id
WHERE b.payment_status = 'approved'
AND b.return_marked = false
AND b.end_date < CURRENT_DATE;

-- Customer payment status view
CREATE OR REPLACE VIEW customer_payment_status_view AS
SELECT 
  u.id as customer_id,
  u.name as customer_name,
  u.email as customer_email,
  COUNT(CASE WHEN oa.alert_type = 'payment_overdue' AND oa.resolved = false THEN 1 END) as active_overdue_alerts,
  COUNT(CASE WHEN oa.severity = 'critical' AND oa.resolved = false THEN 1 END) as critical_alerts,
  SUM(CASE WHEN oa.resolved = false THEN oa.amount_due ELSE 0 END) as total_amount_due,
  MAX(oa.days_overdue) as max_days_overdue,
  COUNT(b.id) as total_active_bookings
FROM users u
LEFT JOIN bookings b ON u.id = b.customer_id AND b.payment_status = 'approved' AND b.return_marked = false
LEFT JOIN overdue_alerts oa ON u.id = oa.customer_id
WHERE u.role = 'customer'
GROUP BY u.id, u.name, u.email;

-- =====================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sold_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_flag_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE overdue_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_and_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_id);

CREATE POLICY "Staff and admin can read all users" ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Admin can manage all users" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_id);

-- Cars table policies
CREATE POLICY "Everyone can read available cars" ON cars
  FOR SELECT TO authenticated
  USING (status = 'available' OR EXISTS (
    SELECT 1 FROM users u 
    WHERE u.auth_id = auth.uid() 
    AND u.role IN ('staff', 'admin')
    AND u.approved = true
  ));

CREATE POLICY "Staff and admin can manage cars" ON cars
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

-- Bookings table policies
CREATE POLICY "Users can read own bookings" ON bookings
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Staff can create bookings" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Staff and admin can update bookings" ON bookings
  FOR UPDATE TO authenticated
  USING (
    staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

-- Payments table policies
CREATE POLICY "Users can read related payments" ON payments
  FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE customer_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      OR staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Staff can manage completed payments" ON payments
  FOR ALL TO authenticated
  USING (
    (payment_completion_status = 'completed' AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    ))
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Admin can manage payments for rejection" ON payments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

-- Documents table policies
CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

-- Payment methods and add-ons policies
CREATE POLICY "Everyone can read payment methods" ON payment_methods
  FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "Everyone can read add-ons" ON add_ons
  FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "Admin can manage payment methods" ON payment_methods
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Admin can manage add-ons" ON add_ons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

-- Car management policies
CREATE POLICY "Admin can manage service records" ON service_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Staff can view service records" ON service_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Admin can manage acquisition details" ON acquisition_details
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Admin can manage maintenance records" ON maintenance_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Staff can view maintenance records" ON maintenance_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Admin can manage car documents" ON car_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Staff can view car documents" ON car_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Admin can manage payment reminders" ON payment_reminders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

-- Staff management policies
CREATE POLICY "Admin can manage all payroll adjustments" ON payroll_adjustments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Staff can view own payroll adjustments" ON payroll_adjustments
  FOR SELECT TO authenticated
  USING (
    staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Admin and supervisors can manage attendance" ON attendance_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Staff can view own attendance" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Admin and supervisors can manage red flags" ON red_flag_incidents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Staff can view own red flags" ON red_flag_incidents
  FOR SELECT TO authenticated
  USING (
    staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Admin and supervisors can manage performance metrics" ON staff_performance_metrics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Staff can view own performance metrics" ON staff_performance_metrics
  FOR SELECT TO authenticated
  USING (
    staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

-- Handover and tracking policies
CREATE POLICY "Staff can manage handover logs" ON handover_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Staff can manage return logs" ON return_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

-- Cancellation and extension policies
CREATE POLICY "Staff can create cancellation requests" ON cancellation_requests 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
      AND u.id = staff_id
    )
    AND
    EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.id = booking_id 
      AND b.staff_id = staff_id
    )
  );

CREATE POLICY "Staff can view own cancellation requests" ON cancellation_requests
  FOR SELECT TO authenticated
  USING (
    staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Admin can manage all cancellation requests" ON cancellation_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Users can view own booking extensions" ON booking_extensions
  FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE customer_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      OR staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Staff can manage booking extensions" ON booking_extensions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Users can view own overdue alerts" ON overdue_alerts
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Users can acknowledge own alerts" ON overdue_alerts
  FOR UPDATE TO authenticated
  USING (customer_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Staff can manage all overdue alerts" ON overdue_alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

-- Invoice and terms policies
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE customer_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Staff and admin can manage invoices" ON invoices
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Everyone can read active terms" ON terms_and_conditions
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Admin can manage terms" ON terms_and_conditions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND u.role = 'admin'
      AND u.registration_status = 'approved'
    )
  );

-- Stripe integration policies
CREATE POLICY "Users can view their own customer data" ON stripe_customers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can view their own subscription data" ON stripe_subscriptions
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id
      FROM stripe_customers
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can view their own order data" ON stripe_orders
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id
      FROM stripe_customers
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- =====================================================
-- 16. INITIAL DATA
-- =====================================================

-- Insert default payment methods
INSERT INTO payment_methods (name, code) VALUES
  ('FPX Online Banking', 'FPX'),
  ('Credit/Debit Card', 'CARD'),
  ('QR Code Payment', 'QR'),
  ('Atome Buy Now Pay Later', 'ATOME')
ON CONFLICT (code) DO NOTHING;

-- Insert default add-ons
INSERT INTO add_ons (name, code, price_daily) VALUES
  ('GPS Navigation', 'GPS', 10.00),
  ('Full Insurance Coverage', 'INSURANCE', 25.00),
  ('Child Safety Seat', 'CHILD_SEAT', 15.00),
  ('WiFi Hotspot', 'WIFI', 8.00),
  ('Dashcam Recording', 'DASHCAM', 12.00),
  ('Phone Charger', 'CHARGER', 5.00)
ON CONFLICT (code) DO NOTHING;

-- Insert admin user
INSERT INTO users (
  email,
  name,
  temp_key,
  role,
  approved,
  active,
  registration_status,
  created_at,
  updated_at
) VALUES (
  'aqibswipe@gmail.com',
  'Admin User',
  '1234',
  'admin',
  true,
  true,
  'approved',
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  temp_key = '1234',
  role = 'admin',
  approved = true,
  active = true,
  registration_status = 'approved',
  updated_at = now();

-- Insert sample staff and customer users
INSERT INTO users (
  email,
  name,
  temp_key,
  role,
  approved,
  active,
  registration_status,
  created_at,
  updated_at
) VALUES 
  (
    'staff@budgetplus.com',
    'Staff User',
    'STAFF123',
    'staff',
    true,
    true,
    'approved',
    now(),
    now()
  ),
  (
    'customer@budgetplus.com',
    'Customer User',
    'CLIENT123',
    'customer',
    true,
    true,
    'approved',
    now(),
    now()
  )
ON CONFLICT (email) DO UPDATE SET
  temp_key = EXCLUDED.temp_key,
  role = EXCLUDED.role,
  approved = true,
  active = true,
  registration_status = 'approved',
  updated_at = now();

-- Insert default terms and conditions
INSERT INTO terms_and_conditions (content, version, effective_date, is_active) VALUES (
  '# Terms and Conditions

## 1. Acceptance of Terms
By using our car rental service, you agree to be bound by these Terms and Conditions.

## 2. Rental Agreement
- All rentals are subject to availability
- Valid driving license required
- Minimum age requirement: 21 years
- Security deposit may be required

## 3. Vehicle Use
- Vehicles must be used for lawful purposes only
- No smoking in vehicles
- Return vehicle in same condition as received
- Report any accidents or damage immediately

## 4. Payment Terms
- Payment due at time of booking
- Late fees may apply for overdue returns
- Cancellation fees may apply

## 5. Insurance and Liability
- Basic insurance coverage included
- Driver responsible for damages not covered by insurance
- Third-party liability coverage required

## 6. Cancellation Policy
- Cancellations must be made through authorized staff
- Refund policies vary by booking type
- Emergency cancellations subject to review

## 7. Privacy Policy
- Personal information collected for rental purposes only
- Data protected according to applicable privacy laws
- Information not shared with third parties without consent

## 8. Modifications
These terms may be updated from time to time. Continued use constitutes acceptance of modified terms.

## 9. Contact Information
For questions about these terms, please contact our customer service team.

*Last updated: ' || CURRENT_DATE || '*',
  '1.0',
  CURRENT_DATE,
  true
) ON CONFLICT DO NOTHING;

-- =====================================================
-- 17. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for views
GRANT SELECT ON stripe_user_subscriptions TO authenticated;
GRANT SELECT ON stripe_user_orders TO authenticated;
GRANT SELECT ON overdue_bookings_view TO authenticated;
GRANT SELECT ON customer_payment_status_view TO authenticated;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_booking_number() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_next_service_due() TO authenticated;
GRANT EXECUTE ON FUNCTION create_payment_reminders() TO authenticated;

-- =====================================================
-- END OF EXPORT
-- =====================================================

-- This completes the full database export for Budget Plus Rental System
-- To import this into a new Supabase account:
-- 1. Create a new Supabase project
-- 2. Go to SQL Editor in the Supabase dashboard
-- 3. Copy and paste this entire script
-- 4. Execute the script
-- 5. Verify all tables, functions, and policies are created correctly
-- 6. Update your application's environment variables with the new Supabase URL and keys

-- Note: Remember to also migrate any storage buckets and their policies separately
-- as they are not included in this SQL export.