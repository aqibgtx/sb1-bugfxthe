/*
  # Enhanced Cancellation Flow Implementation

  1. Functions
    - Enhanced process_approved_cancellation function
    - Auto-cancel unpaid bookings after 3 days
    - Ensure payment exists for approved bookings
    - Log booking payment status changes

  2. Schema Updates
    - Add handover/return tracking columns
    - Create indexes for performance
    - Update triggers

  3. Views
    - Overdue bookings view for easier queries
*/

-- Enhanced function to process approved cancellation requests
CREATE OR REPLACE FUNCTION process_approved_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- When a cancellation request is approved, cancel the booking and related payment
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Update booking status to cancelled
    UPDATE bookings 
    SET 
      booking_status = 'cancelled',
      payment_status = 'cancelled',
      notes = COALESCE(notes, '') || ' | Cancelled by admin approval. Reason: ' || NEW.reason,
      updated_at = now()
    WHERE id = NEW.booking_id;
    
    -- Update payment completion status to cancelled if exists
    UPDATE payments 
    SET 
      payment_completion_status = 'cancelled',
      admin_approval_status = 'cancelled',
      notes = COALESCE(notes, '') || ' | Payment cancelled due to booking cancellation approval.',
      updated_at = now()
    WHERE booking_id = NEW.booking_id;
    
    -- Set approval details
    NEW.approved_by = (SELECT id FROM users WHERE auth_id = auth.uid());
    NEW.approved_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Enhanced function to automatically cancel unpaid bookings after 3 days
CREATE OR REPLACE FUNCTION auto_cancel_unpaid_bookings()
RETURNS void AS $$
DECLARE
  cancelled_count integer := 0;
BEGIN
  -- Cancel bookings that are approved but not handed over within 3 days
  UPDATE bookings 
  SET 
    booking_status = 'cancelled',
    payment_status = 'cancelled',
    notes = COALESCE(notes, '') || ' | Auto-cancelled: Vehicle not handed over within 3 days of approval.',
    updated_at = now()
  WHERE 
    booking_status = 'approved' 
    AND handover_marked = false
    AND created_at < now() - INTERVAL '3 days'
    AND booking_status != 'cancelled';
    
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  
  -- Also cancel related payments
  UPDATE payments 
  SET 
    payment_completion_status = 'cancelled',
    admin_approval_status = 'cancelled',
    notes = COALESCE(notes, '') || ' | Payment cancelled due to auto-cancellation of booking.',
    updated_at = now()
  WHERE booking_id IN (
    SELECT id FROM bookings 
    WHERE booking_status = 'cancelled' 
    AND notes LIKE '%Auto-cancelled: Vehicle not handed over within 3 days%'
    AND updated_at > now() - INTERVAL '1 minute'
  );
    
  -- Log the number of bookings cancelled
  IF cancelled_count > 0 THEN
    RAISE NOTICE 'Auto-cancelled % unpaid bookings older than 3 days', cancelled_count;
  END IF;
END;
$$ language 'plpgsql';

-- Function to ensure payment exists for approved bookings
CREATE OR REPLACE FUNCTION ensure_payment_exists_for_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking is approved, ensure a payment record exists
  IF NEW.booking_status = 'approved' AND OLD.booking_status = 'pending_approval' THEN
    -- Check if payment already exists
    IF NOT EXISTS (SELECT 1 FROM payments WHERE booking_id = NEW.id) THEN
      -- Create a payment record
      INSERT INTO payments (
        booking_id,
        amount,
        payment_method_code,
        admin_approval_status,
        payment_completion_status,
        car_name,
        car_plate_number,
        is_agent_booking,
        custom_price_requested,
        agent_notes,
        created_at
      ) VALUES (
        NEW.id,
        NEW.total_amount,
        'PENDING',
        'pending',
        'pending',
        NEW.car_name,
        NEW.car_plate_number,
        NEW.is_agent_booking,
        NEW.custom_price_requested,
        NEW.agent_notes,
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to log booking payment status changes
CREATE OR REPLACE FUNCTION log_booking_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when payment status changes
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    -- Add to notes for tracking
    NEW.notes = COALESCE(NEW.notes, '') || 
      ' | Payment status changed from ' || COALESCE(OLD.payment_status, 'null') || 
      ' to ' || COALESCE(NEW.payment_status, 'null') || 
      ' at ' || now()::text;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add missing columns to bookings table if they don't exist
DO $$
BEGIN
  -- Add handover_marked column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'handover_marked'
  ) THEN
    ALTER TABLE bookings ADD COLUMN handover_marked boolean DEFAULT false;
  END IF;
  
  -- Add handover_photo_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'handover_photo_url'
  ) THEN
    ALTER TABLE bookings ADD COLUMN handover_photo_url text;
  END IF;
  
  -- Add handover_time column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'handover_time'
  ) THEN
    ALTER TABLE bookings ADD COLUMN handover_time timestamptz;
  END IF;
  
  -- Add handover_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'handover_by'
  ) THEN
    ALTER TABLE bookings ADD COLUMN handover_by uuid REFERENCES users(id);
  END IF;
  
  -- Add return_marked column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'return_marked'
  ) THEN
    ALTER TABLE bookings ADD COLUMN return_marked boolean DEFAULT false;
  END IF;
  
  -- Add return_photo_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'return_photo_url'
  ) THEN
    ALTER TABLE bookings ADD COLUMN return_photo_url text;
  END IF;
  
  -- Add actual_return_time column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'actual_return_time'
  ) THEN
    ALTER TABLE bookings ADD COLUMN actual_return_time timestamptz;
  END IF;
  
  -- Add returned_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'returned_by'
  ) THEN
    ALTER TABLE bookings ADD COLUMN returned_by uuid REFERENCES users(id);
  END IF;
  
  -- Add late_fee column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'late_fee'
  ) THEN
    ALTER TABLE bookings ADD COLUMN late_fee decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_handover_marked ON bookings(handover_marked);
CREATE INDEX IF NOT EXISTS idx_bookings_handover_time ON bookings(handover_time);
CREATE INDEX IF NOT EXISTS idx_bookings_handover_by ON bookings(handover_by);
CREATE INDEX IF NOT EXISTS idx_bookings_return_marked ON bookings(return_marked);
CREATE INDEX IF NOT EXISTS idx_bookings_returned_by ON bookings(returned_by);
CREATE INDEX IF NOT EXISTS idx_bookings_actual_return_time ON bookings(actual_return_time);

-- Update existing triggers
DROP TRIGGER IF EXISTS ensure_payment_exists_trigger ON bookings;
CREATE TRIGGER ensure_payment_exists_trigger 
  AFTER UPDATE ON bookings 
  FOR EACH ROW 
  WHEN (NEW.booking_status = 'approved' AND OLD.booking_status IS DISTINCT FROM NEW.booking_status)
  EXECUTE FUNCTION ensure_payment_exists_for_booking();

DROP TRIGGER IF EXISTS log_booking_payment_status_change_trigger ON bookings;
CREATE TRIGGER log_booking_payment_status_change_trigger 
  BEFORE UPDATE ON bookings 
  FOR EACH ROW 
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION log_booking_payment_status_change();

-- Grant execute permission for the auto-cancel function
GRANT EXECUTE ON FUNCTION auto_cancel_unpaid_bookings() TO authenticated;

-- Drop existing view if it exists to avoid data type conflicts
DROP VIEW IF EXISTS overdue_bookings_view;

-- Create a view for overdue bookings to make queries easier
CREATE VIEW overdue_bookings_view AS
SELECT 
  b.id as booking_id,
  b.booking_number,
  b.customer_id,
  c.name as customer_name,
  c.email as customer_email,
  b.car_id,
  car.brand || ' ' || car.make as car_name,
  car.plate_number,
  b.start_date,
  b.end_date,
  EXTRACT(DAY FROM (now() - b.end_date::timestamp))::integer as days_overdue,
  b.total_amount,
  b.booking_status,
  b.payment_status,
  b.notes
FROM bookings b
JOIN users c ON b.customer_id = c.id
JOIN cars car ON b.car_id = car.id
WHERE 
  b.end_date < CURRENT_DATE 
  AND b.return_marked = false 
  AND b.booking_status IN ('approved', 'ongoing')
  AND b.payment_status = 'approved';

-- Grant access to the view
GRANT SELECT ON overdue_bookings_view TO authenticated;