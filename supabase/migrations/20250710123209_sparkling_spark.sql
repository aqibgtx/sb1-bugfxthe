/*
  # Booking Extension System Implementation

  1. New Tables
    - `booking_extensions` - Track booking extensions with payment details
    - Add `extended_payment_link` column to payments table

  2. New Enum Types
    - Add 'extensions' to admin approval workflow

  3. Security
    - Enable RLS on booking_extensions table
    - Add appropriate policies for admin, staff, and customer access

  4. Features
    - Track extension requests and approvals
    - Separate payment handling for extensions
    - Maintain audit trail of all extensions
*/

-- Create booking_extensions table
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

-- Add extended_payment_link column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS extended_payment_link text;

-- Enable Row Level Security
ALTER TABLE booking_extensions ENABLE ROW LEVEL SECURITY;

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
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Staff and admin can create extensions" ON booking_extensions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Admin can manage all extensions" ON booking_extensions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_booking_extensions_updated_at ON booking_extensions;
CREATE TRIGGER update_booking_extensions_updated_at BEFORE UPDATE ON booking_extensions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_extensions_booking_id ON booking_extensions(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_extensions_payment_status ON booking_extensions(payment_status);

-- Drop function if exists and recreate
DROP FUNCTION IF EXISTS extend_booking(uuid, integer, decimal, uuid);
CREATE OR REPLACE FUNCTION extend_booking(
  p_booking_id uuid,
  p_extension_days integer,
  p_daily_rate decimal(10,2),
  p_created_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record bookings%ROWTYPE;
  extension_amount decimal(10,2);
  new_end_date date;
  extension_id uuid;
  result json;
BEGIN
  -- Get the booking record
  SELECT * INTO booking_record
  FROM bookings
  WHERE id = p_booking_id;

  -- Check if booking exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Check if booking can be extended
  IF booking_record.booking_status NOT IN ('approved', 'ongoing', 'handed_over') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking cannot be extended in current status'
    );
  END IF;

  -- Calculate extension details
  extension_amount := p_extension_days * p_daily_rate;
  new_end_date := booking_record.end_date + (p_extension_days || ' days')::interval;

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
    new_end_date,
    p_extension_days,
    p_daily_rate,
    extension_amount,
    new_end_date,
    p_created_by
  ) RETURNING id INTO extension_id;

  -- Update booking end_date
  UPDATE bookings 
  SET 
    end_date = new_end_date,
    total_days = total_days + p_extension_days,
    updated_at = now()
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'extension_id', extension_id,
    'new_end_date', new_end_date,
    'extension_amount', extension_amount,
    'message', 'Booking extended successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION extend_booking(uuid, integer, decimal, uuid) TO authenticated;

-- Drop function if exists and recreate
DROP FUNCTION IF EXISTS handle_extension_payment_completion();
CREATE OR REPLACE FUNCTION handle_extension_payment_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When extension payment is completed, update extension status
  IF NEW.extended_payment_link IS NOT NULL AND OLD.extended_payment_link IS NULL THEN
    -- Find related extension and update payment status
    UPDATE booking_extensions 
    SET 
      payment_status = 'paid',
      updated_at = now()
    WHERE booking_id = NEW.booking_id
    AND payment_status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS handle_extension_payment_completion_trigger ON payments;
CREATE TRIGGER handle_extension_payment_completion_trigger
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION handle_extension_payment_completion();