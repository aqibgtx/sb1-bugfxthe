/*
  # Add Return Car System

  1. Schema Changes
    - Add return tracking fields to bookings table
    - Create return_logs table for audit trail
    - Add indexes for better performance

  2. Security
    - Enable RLS on return_logs table
    - Add policies for staff access

  3. Features
    - Track return status and photos
    - Calculate late fees automatically
    - Audit trail for all returns
*/

-- Add return tracking fields to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_marked boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_photo_url text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS actual_return_time timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS late_fee decimal(10,2) DEFAULT 0;

-- Create return_logs table for audit trail
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

-- Enable Row Level Security
ALTER TABLE return_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for return_logs
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_return_marked ON bookings(return_marked);
CREATE INDEX IF NOT EXISTS idx_bookings_actual_return_time ON bookings(actual_return_time);
CREATE INDEX IF NOT EXISTS idx_return_logs_booking_id ON return_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_return_logs_marked_by ON return_logs(marked_by);

-- Add comments to document the new fields
COMMENT ON COLUMN bookings.return_marked IS 'Whether the car has been marked as returned by staff';
COMMENT ON COLUMN bookings.return_photo_url IS 'Photo of the returned car for verification';
COMMENT ON COLUMN bookings.actual_return_time IS 'Actual timestamp when car was returned';
COMMENT ON COLUMN bookings.late_fee IS 'Late fee calculated if car returned after end_date';

-- Function to calculate late fee
CREATE OR REPLACE FUNCTION calculate_late_fee(
  expected_return timestamptz,
  actual_return timestamptz,
  daily_price decimal
) RETURNS decimal AS $$
DECLARE
  hours_late decimal;
  late_fee decimal;
BEGIN
  -- Calculate hours late (minimum 0)
  hours_late := GREATEST(0, EXTRACT(EPOCH FROM (actual_return - expected_return)) / 3600);
  
  -- Calculate late fee: 10% of daily price per hour, rounded up
  late_fee := CEIL(hours_late) * daily_price * 0.1;
  
  RETURN late_fee;
END;
$$ language 'plpgsql';

-- Function to handle car return
CREATE OR REPLACE FUNCTION process_car_return()
RETURNS TRIGGER AS $$
DECLARE
  calculated_late_fee decimal;
  expected_return_time timestamptz;
BEGIN
  -- When return_marked is set to true, process the return
  IF NEW.return_marked = true AND (OLD.return_marked IS NULL OR OLD.return_marked = false) THEN
    -- Calculate expected return time (end of end_date)
    expected_return_time := NEW.end_date + INTERVAL '23 hours 59 minutes';
    
    -- Calculate late fee if applicable
    calculated_late_fee := calculate_late_fee(
      expected_return_time,
      NEW.actual_return_time,
      NEW.rental_amount / NEW.total_days
    );
    
    -- Update late fee
    NEW.late_fee = calculated_late_fee;
    
    -- Update booking status to completed if payment is approved
    IF NEW.payment_status = 'approved' THEN
      NEW.payment_status = 'completed';
    END IF;
    
    -- Create return log entry
    INSERT INTO return_logs (
      booking_id,
      marked_by,
      return_photo_url,
      actual_return_time,
      late_fee_calculated,
      notes
    ) VALUES (
      NEW.id,
      (SELECT id FROM users WHERE auth_id = auth.uid()),
      NEW.return_photo_url,
      NEW.actual_return_time,
      calculated_late_fee,
      CASE 
        WHEN calculated_late_fee > 0 THEN 
          'Car returned late. Late fee: RM' || calculated_late_fee::text
        ELSE 
          'Car returned on time'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for car return processing
DROP TRIGGER IF EXISTS process_car_return_trigger ON bookings;
CREATE TRIGGER process_car_return_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION process_car_return();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_late_fee(timestamptz, timestamptz, decimal) TO authenticated;