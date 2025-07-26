/*
  # Fix Booking and Payment Approval Issues

  1. Update car status function to respond to booking_status changes
  2. Fix payment approval workflow
  3. Ensure proper separation between booking approval and payment approval

  Changes:
  - Car becomes 'rented' when booking_status = 'approved' (regardless of payment)
  - Payment approval is separate from booking approval
  - Fix payment approval function to work correctly
*/

-- Update the car status function to respond to booking_status changes immediately
CREATE OR REPLACE FUNCTION update_car_status_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking status changes, update car status accordingly
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If booking is approved, mark car as rented IMMEDIATELY (regardless of payment status)
    IF NEW.booking_status = 'approved' AND (OLD.booking_status IS NULL OR OLD.booking_status != 'approved') THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
      
      -- Log the car status change
      RAISE NOTICE 'Car % marked as rented due to booking % approval', NEW.car_id, NEW.id;
      
    -- If booking is completed or cancelled, mark car as available
    ELSIF NEW.booking_status IN ('completed', 'cancelled') AND OLD.booking_status NOT IN ('completed', 'cancelled') THEN
      -- Only mark as available if no other approved bookings exist
      UPDATE cars SET status = 'available' 
      WHERE id = NEW.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = NEW.car_id 
        AND booking_status = 'approved'
        AND id != NEW.id
      );
      
      -- Log the car status change
      RAISE NOTICE 'Car % marked as available due to booking % completion/cancellation', NEW.car_id, NEW.id;
    END IF;
  END IF;
  
  -- Handle deletion
  IF TG_OP = 'DELETE' THEN
    -- If an approved booking is deleted, check if car should be available
    IF OLD.booking_status = 'approved' THEN
      UPDATE cars SET status = 'available' 
      WHERE id = OLD.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = OLD.car_id 
        AND booking_status = 'approved'
      );
      
      -- Log the car status change
      RAISE NOTICE 'Car % marked as available due to approved booking % deletion', OLD.car_id, OLD.id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update the payment approval function to work correctly
CREATE OR REPLACE FUNCTION handle_stripe_payment_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment completion status changes to completed, update booking
  IF NEW.payment_completion_status = 'completed' AND (OLD.payment_completion_status IS NULL OR OLD.payment_completion_status != 'completed') THEN
    UPDATE bookings 
    SET 
      payment_status = 'payment_completed',
      notes = COALESCE(notes, '') || ' | Payment completed via Stripe webhook.',
      updated_at = now()
    WHERE id = NEW.booking_id;
    
    RAISE NOTICE 'Booking % payment status updated to payment_completed', NEW.booking_id;
  END IF;
  
  -- When admin approves completed payment, update booking to approved
  IF NEW.admin_approval_status = 'approved' AND (OLD.admin_approval_status IS NULL OR OLD.admin_approval_status != 'approved') THEN
    UPDATE bookings 
    SET 
      payment_status = 'approved',
      notes = COALESCE(notes, '') || ' | Payment approved by admin.',
      updated_at = now()
    WHERE id = NEW.booking_id;
    
    RAISE NOTICE 'Booking % payment status updated to approved by admin', NEW.booking_id;
  END IF;
  
  -- When admin rejects payment, update booking to rejected
  IF NEW.admin_approval_status = 'rejected' AND (OLD.admin_approval_status IS NULL OR OLD.admin_approval_status != 'rejected') THEN
    UPDATE bookings 
    SET 
      payment_status = 'rejected',
      notes = COALESCE(notes, '') || ' | Payment rejected by admin.',
      updated_at = now()
    WHERE id = NEW.booking_id;
    
    RAISE NOTICE 'Booking % payment status updated to rejected by admin', NEW.booking_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS update_car_status_trigger ON bookings;
CREATE TRIGGER update_car_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_car_status_from_booking();

-- Ensure the payment trigger is properly set up
DROP TRIGGER IF EXISTS handle_stripe_payment_completion_trigger ON payments;
CREATE TRIGGER handle_stripe_payment_completion_trigger
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION handle_stripe_payment_completion();

-- Update existing cars to have correct status based on current approved bookings
UPDATE cars SET status = 'rented' 
WHERE id IN (
  SELECT DISTINCT car_id FROM bookings 
  WHERE booking_status = 'approved'
);

UPDATE cars SET status = 'available' 
WHERE status = 'rented' 
AND id NOT IN (
  SELECT DISTINCT car_id FROM bookings 
  WHERE booking_status = 'approved'
);

-- Fix any existing bookings that should have payment records
INSERT INTO payments (
  booking_id,
  amount,
  payment_method_code,
  payment_completion_status,
  admin_approval_status,
  notes,
  created_at
)
SELECT 
  b.id,
  b.total_amount,
  'PENDING',
  'pending',
  'pending',
  'Payment record created for existing approved booking',
  b.created_at
FROM bookings b
WHERE b.booking_status = 'approved'
AND NOT EXISTS (
  SELECT 1 FROM payments p WHERE p.booking_id = b.id
)
ON CONFLICT (booking_id) DO NOTHING;