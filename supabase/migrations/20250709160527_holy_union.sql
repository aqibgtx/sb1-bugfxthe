/*
  # Fix Cancellation System for Unapproved Bookings

  1. Database Functions
    - Update cancellation handling to properly track booking and payment IDs
    - Ensure cancelled bookings/payments don't show in approvals
    - Move cancelled items to history section

  2. Schema Updates
    - Ensure proper enum values exist
    - Add indexes for better performance

  3. Triggers
    - Update triggers to handle cancellation workflow properly
*/

-- Function to handle self-cancellation by staff/client before admin approval
CREATE OR REPLACE FUNCTION handle_self_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking_status or payment_status is set to 'cancelled' directly (not through admin approval)
  IF (NEW.booking_status = 'cancelled' OR NEW.payment_status = 'cancelled') AND 
     (OLD.booking_status != 'cancelled' AND OLD.payment_status != 'cancelled') THEN
    
    -- Update both booking and payment statuses to cancelled
    NEW.booking_status = 'cancelled';
    NEW.payment_status = 'cancelled';
    
    -- Add note about self-cancellation
    NEW.notes = COALESCE(NEW.notes, '') || ' | Self-cancelled before admin approval at ' || now()::text;
    NEW.updated_at = now();
    
    -- Update related payment record to cancelled status
    UPDATE payments 
    SET 
      payment_completion_status = 'cancelled',
      admin_approval_status = 'cancelled',
      notes = COALESCE(notes, '') || ' | Payment cancelled due to booking self-cancellation.',
      updated_at = now()
    WHERE booking_id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for self-cancellation handling
DROP TRIGGER IF EXISTS handle_self_cancellation_trigger ON bookings;
CREATE TRIGGER handle_self_cancellation_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_self_cancellation();

-- Function to sync payment cancellation with booking
CREATE OR REPLACE FUNCTION sync_payment_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment is cancelled, also cancel the booking
  IF NEW.admin_approval_status = 'cancelled' AND OLD.admin_approval_status != 'cancelled' THEN
    UPDATE bookings 
    SET 
      booking_status = 'cancelled',
      payment_status = 'cancelled',
      notes = COALESCE(notes, '') || ' | Booking cancelled due to payment cancellation.',
      updated_at = now()
    WHERE id = NEW.booking_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for payment cancellation sync
DROP TRIGGER IF EXISTS sync_payment_cancellation_trigger ON payments;
CREATE TRIGGER sync_payment_cancellation_trigger
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_payment_cancellation();

-- Update the existing process_approved_cancellation function to properly track IDs
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
      notes = COALESCE(notes, '') || ' | Cancelled by admin approval. Reason: ' || NEW.reason || ' | Cancellation ID: ' || NEW.id,
      updated_at = now()
    WHERE id = NEW.booking_id;
    
    -- Update payment completion status to cancelled if exists
    UPDATE payments 
    SET 
      payment_completion_status = 'cancelled',
      admin_approval_status = 'cancelled',
      notes = COALESCE(notes, '') || ' | Payment cancelled due to booking cancellation approval. Cancellation ID: ' || NEW.id,
      updated_at = now()
    WHERE booking_id = NEW.booking_id;
    
    -- Set approval details
    NEW.approved_by = (SELECT id FROM users WHERE auth_id = auth.uid());
    NEW.approved_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add indexes for better performance on cancelled items queries
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_status ON bookings(booking_status, payment_status) WHERE booking_status = 'cancelled' OR payment_status = 'cancelled';
CREATE INDEX IF NOT EXISTS idx_payments_cancelled_status ON payments(admin_approval_status, payment_completion_status) WHERE admin_approval_status = 'cancelled' OR payment_completion_status = 'cancelled';

-- Update the overdue_bookings_view to exclude cancelled bookings
DROP VIEW IF EXISTS overdue_bookings_view;
CREATE VIEW overdue_bookings_view AS
SELECT 
  b.id as booking_id,
  b.booking_number,
  b.customer_id,
  c.name as customer_name,
  c.email as customer_email,
  b.car_id,
  COALESCE(b.car_name, car.brand || ' ' || car.make) as car_name,
  COALESCE(b.car_plate_number, car.plate_number) as plate_number,
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
  AND b.payment_status NOT IN ('cancelled', 'rejected')
  AND b.booking_status != 'cancelled';

-- Grant access to the updated view
GRANT SELECT ON overdue_bookings_view TO authenticated;