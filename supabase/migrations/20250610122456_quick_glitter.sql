/*
  # Complete Budget Plus Rental Database Schema

  1. New Tables
    - `users` - User accounts (customers, staff, admin)
    - `cars` - Vehicle inventory management
    - `bookings` - Rental bookings and reservations
    - `payments` - Payment records and receipts
    - `payment_methods` - Available payment options
    - `add_ons` - Additional services and pricing
    - `booking_add_ons` - Junction table for booking add-ons
    - `documents` - User document uploads
    - `sold_cars` - Records of sold vehicles
    - `delivery_details` - Car delivery information

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each user role
    - Secure file uploads and access

  3. Features
    - Complete user management with approval workflow
    - Car inventory with maintenance tracking
    - Booking system with payment integration
    - Document management
    - ROI tracking and analytics
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  updated_at timestamptz DEFAULT now()
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
  updated_at timestamptz DEFAULT now()
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
  status text CHECK (status IN ('pending', 'approved', 'ongoing', 'completed', 'cancelled')) DEFAULT 'pending',
  payment_status text CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  delivery_enabled boolean DEFAULT false,
  delivery_km_travelled integer DEFAULT 0,
  delivery_toll_fee decimal(10,2) DEFAULT 0,
  delivery_petrol_fee decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
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
  booking_id uuid REFERENCES bookings(id) NOT NULL,
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
  updated_at timestamptz DEFAULT now()
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
  delivery_date timestamptz,
  pickup_date timestamptz,
  delivery_status text CHECK (delivery_status IN ('pending', 'delivered', 'picked_up')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

-- Enable Row Level Security
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

-- RLS Policies for users table
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
      AND u.approved = true
    )
  );

CREATE POLICY "Admin can manage all users" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_id);

-- RLS Policies for cars table
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

-- RLS Policies for bookings table
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

-- RLS Policies for payments table
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

CREATE POLICY "Staff can manage payments" ON payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

-- RLS Policies for documents table
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

-- RLS Policies for other tables (read-only for most users)
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

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
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

-- Function to generate booking numbers
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_number = 'BK' || LPAD(nextval('booking_number_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for booking numbers
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1;

-- Trigger for booking number generation
CREATE TRIGGER generate_booking_number_trigger BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_number();