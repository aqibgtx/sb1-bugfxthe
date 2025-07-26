/*
  # Comprehensive Car Management System

  1. New Tables
    - `service_records` - Vehicle service history tracking
    - `acquisition_details` - Purchase method and financial details
    - `maintenance_records` - Detailed maintenance and repair records
    - `car_documents` - Document management for vehicles
    - `payment_reminders` - Automated payment tracking

  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies for admin access
    - Secure document access

  3. Features
    - Service interval tracking with automated alerts
    - Comprehensive acquisition method support
    - Maintenance cost tracking with condition assessments
    - Document expiry notifications
    - Payment reminder system
*/

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

-- Enable Row Level Security
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_records
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

-- RLS Policies for acquisition_details (Admin only)
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

-- RLS Policies for maintenance_records
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

-- RLS Policies for car_documents
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

-- RLS Policies for payment_reminders
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

-- Triggers for updated_at
CREATE TRIGGER update_acquisition_details_updated_at BEFORE UPDATE ON acquisition_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_reminders_updated_at BEFORE UPDATE ON payment_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next service due
CREATE OR REPLACE FUNCTION calculate_next_service_due()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_service_due = NEW.mileage + 5000;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automatic next service calculation
CREATE TRIGGER calculate_next_service_due_trigger BEFORE INSERT ON service_records
  FOR EACH ROW EXECUTE FUNCTION calculate_next_service_due();

-- Function to create payment reminders for loans
CREATE OR REPLACE FUNCTION create_payment_reminders()
RETURNS TRIGGER AS $$
DECLARE
  reminder_date date;
  i integer;
BEGIN
  -- Only create reminders for loan and sambung_bayar
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

-- Trigger for automatic payment reminder creation
CREATE TRIGGER create_payment_reminders_trigger AFTER INSERT ON acquisition_details
  FOR EACH ROW EXECUTE FUNCTION create_payment_reminders();

-- Insert sample service records for existing cars
INSERT INTO service_records (car_id, service_type, service_date, mileage, cost, description, service_provider)
SELECT 
  id,
  'engine_oil',
  CURRENT_DATE - INTERVAL '30 days',
  COALESCE(current_mileage, 0) - 1000,
  150.00,
  'Regular engine oil change and filter replacement',
  'AutoService Workshop'
FROM cars
WHERE id IN (SELECT id FROM cars LIMIT 3)
ON CONFLICT DO NOTHING;

-- Insert sample acquisition details
INSERT INTO acquisition_details (car_id, purchase_method, purchase_price, initial_payment, monthly_installment, bank_name, loan_start_date, loan_duration_months)
SELECT 
  id,
  'loan',
  purchase_price,
  purchase_price * 0.2,
  (purchase_price * 0.8) / 60,
  'Maybank',
  CURRENT_DATE - INTERVAL '6 months',
  60
FROM cars
WHERE purchase_method = 'loan'
LIMIT 2
ON CONFLICT DO NOTHING;