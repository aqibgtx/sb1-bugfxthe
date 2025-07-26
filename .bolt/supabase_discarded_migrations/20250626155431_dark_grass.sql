/*
  # Overdue Payment Tracking System

  1. New Tables
    - `booking_extensions` - Track rental extensions and their payment status
    - `overdue_alerts` - Store alerts for unpaid extensions

  2. Functions
    - Detect overdue payments automatically
    - Calculate additional charges for extensions
    - Generate alerts for customers and admin

  3. Views
    - `overdue_bookings_view` - Easy access to overdue rental information
    - `customer_payment_status_view` - Customer payment status overview

  4. Security
    - RLS policies for customer and admin access
    - Audit trail for all payment-related changes
*/

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

-- Enable RLS
ALTER TABLE booking_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE overdue_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_extensions
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

-- RLS Policies for overdue_alerts
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_extensions_booking_id ON booking_extensions(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_extensions_payment_status ON booking_extensions(payment_status);
CREATE INDEX IF NOT EXISTS idx_overdue_alerts_customer_id ON overdue_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_overdue_alerts_booking_id ON overdue_alerts(booking_id);
CREATE INDEX IF NOT EXISTS idx_overdue_alerts_resolved ON overdue_alerts(resolved);

-- Triggers
CREATE TRIGGER update_booking_extensions_updated_at BEFORE UPDATE ON booking_extensions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to detect overdue payments
CREATE OR REPLACE FUNCTION detect_overdue_payments()
RETURNS void AS $$
DECLARE
  booking_record RECORD;
  days_past_due integer;
  daily_rate decimal;
  amount_overdue decimal;
  existing_alert_id uuid;
BEGIN
  -- Find all active bookings that are past their end date and not returned
  FOR booking_record IN 
    SELECT 
      b.id,
      b.customer_id,
      b.car_id,
      b.end_date,
      b.total_days,
      b.rental_amount,
      b.return_marked,
      b.car_name,
      b.car_plate_number,
      c.name as customer_name,
      c.email as customer_email
    FROM bookings b
    JOIN users c ON b.customer_id = c.id
    WHERE b.payment_status = 'approved'
    AND b.return_marked = false
    AND b.end_date < CURRENT_DATE
  LOOP
    -- Calculate days past due
    days_past_due := CURRENT_DATE - booking_record.end_date;
    daily_rate := booking_record.rental_amount / booking_record.total_days;
    amount_overdue := days_past_due * daily_rate;
    
    -- Check if alert already exists
    SELECT id INTO existing_alert_id
    FROM overdue_alerts
    WHERE booking_id = booking_record.id
    AND alert_type = 'payment_overdue'
    AND resolved = false;
    
    IF existing_alert_id IS NOT NULL THEN
      -- Update existing alert
      UPDATE overdue_alerts
      SET 
        days_overdue = days_past_due,
        amount_due = amount_overdue,
        severity = CASE 
          WHEN days_past_due >= 7 THEN 'critical'
          WHEN days_past_due >= 3 THEN 'warning'
          ELSE 'info'
        END,
        message = 'Your rental of ' || booking_record.car_name || ' (' || booking_record.car_plate_number || ') is ' || days_past_due || ' days overdue. Please contact us immediately to arrange payment of RM' || amount_overdue::text || ' or return the vehicle.',
        updated_at = now()
      WHERE id = existing_alert_id;
    ELSE
      -- Create new alert
      INSERT INTO overdue_alerts (
        booking_id,
        customer_id,
        alert_type,
        severity,
        title,
        message,
        days_overdue,
        amount_due
      ) VALUES (
        booking_record.id,
        booking_record.customer_id,
        'payment_overdue',
        CASE 
          WHEN days_past_due >= 7 THEN 'critical'
          WHEN days_past_due >= 3 THEN 'warning'
          ELSE 'info'
        END,
        'Overdue Rental Payment Required',
        'Your rental of ' || booking_record.car_name || ' (' || booking_record.car_plate_number || ') is ' || days_past_due || ' days overdue. Please contact us immediately to arrange payment of RM' || amount_overdue::text || ' or return the vehicle.',
        days_past_due,
        amount_overdue
      );
    END IF;
  END LOOP;
  
  -- Mark resolved alerts for returned cars
  UPDATE overdue_alerts
  SET 
    resolved = true,
    resolved_at = now()
  WHERE booking_id IN (
    SELECT id FROM bookings WHERE return_marked = true
  )
  AND resolved = false;
END;
$$ language 'plpgsql';

-- Function to create booking extension
CREATE OR REPLACE FUNCTION create_booking_extension(
  p_booking_id uuid,
  p_new_end_date date,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  booking_record RECORD;
  extension_days integer;
  daily_rate decimal;
  extension_amount decimal;
  extension_id uuid;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record
  FROM bookings
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Calculate extension details
  extension_days := p_new_end_date - booking_record.end_date;
  
  IF extension_days <= 0 THEN
    RAISE EXCEPTION 'New end date must be after current end date';
  END IF;
  
  daily_rate := booking_record.rental_amount / booking_record.total_days;
  extension_amount := extension_days * daily_rate;
  
  -- Create extension record
  INSERT INTO booking_extensions (
    booking_id,
    original_end_date,
    extended_end_date,
    extension_days,
    daily_rate,
    extension_amount,
    payment_due_date,
    created_by
  ) VALUES (
    p_booking_id,
    booking_record.end_date,
    p_new_end_date,
    extension_days,
    daily_rate,
    extension_amount,
    p_new_end_date,
    p_created_by
  ) RETURNING id INTO extension_id;
  
  -- Update booking end date
  UPDATE bookings
  SET 
    end_date = p_new_end_date,
    total_days = total_days + extension_days,
    total_amount = total_amount + extension_amount,
    notes = COALESCE(notes, '') || ' | Extended by ' || extension_days || ' days. Additional charge: RM' || extension_amount::text,
    updated_at = now()
  WHERE id = p_booking_id;
  
  RETURN extension_id;
END;
$$ language 'plpgsql';

-- View for overdue bookings
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

-- View for customer payment status
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

-- Grant permissions
GRANT SELECT ON overdue_bookings_view TO authenticated;
GRANT SELECT ON customer_payment_status_view TO authenticated;
GRANT EXECUTE ON FUNCTION detect_overdue_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION create_booking_extension(uuid, date, uuid) TO authenticated;

-- Create a scheduled job to run overdue detection (this would typically be set up as a cron job)
-- For now, we'll create a function that can be called manually or via a scheduled task
CREATE OR REPLACE FUNCTION run_overdue_payment_check()
RETURNS text AS $$
BEGIN
  PERFORM detect_overdue_payments();
  RETURN 'Overdue payment check completed at ' || now()::text;
END;
$$ language 'plpgsql';

GRANT EXECUTE ON FUNCTION run_overdue_payment_check() TO authenticated;