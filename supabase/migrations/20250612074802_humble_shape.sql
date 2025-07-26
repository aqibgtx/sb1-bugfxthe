/*
  # Update Payment Rejection to Set Booking Status as Rejected

  1. Schema Changes
    - Add 'rejected' as a valid payment_status value
    - Update existing functions to use 'rejected' instead of 'cancelled'

  2. Function Updates
    - Modify payment rejection handler to set status as 'rejected'
    - Maintain data consistency
*/

-- Add 'rejected' to the payment_status enum
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'completed', 'cancelled', 'refunded', 'rejected'));

-- Update the payment rejection function to use 'rejected' status
CREATE OR REPLACE FUNCTION handle_payment_rejection()
RETURNS TRIGGER AS $$
BEGIN
  -- When a payment is deleted (rejected), update the associated booking
  IF TG_OP = 'DELETE' THEN
    -- Update the booking status to rejected (not cancelled)
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

-- Update the booking consistency function to handle rejected status
CREATE OR REPLACE FUNCTION ensure_booking_payment_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking payment_status is updated to rejected or cancelled, ensure no approved payments exist
  IF NEW.payment_status IN ('rejected', 'cancelled') AND OLD.payment_status NOT IN ('rejected', 'cancelled') THEN
    -- Delete any unapproved payments for this booking
    DELETE FROM payments 
    WHERE booking_id = NEW.id AND approved = false;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update car status function to handle rejected bookings
CREATE OR REPLACE FUNCTION update_car_status_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking payment status changes, update car status accordingly
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If booking is paid, mark car as rented
    IF NEW.payment_status = 'paid' THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
    -- If booking is completed, cancelled, rejected, or refunded, mark car as available
    ELSIF NEW.payment_status IN ('completed', 'cancelled', 'refunded', 'rejected') THEN
      -- Only mark as available if no other active bookings exist
      UPDATE cars SET status = 'available' 
      WHERE id = NEW.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = NEW.car_id 
        AND payment_status = 'paid' 
        AND id != NEW.id
      );
    END IF;
  END IF;
  
  -- Handle deletion
  IF TG_OP = 'DELETE' THEN
    -- If a paid booking is deleted, check if car should be available
    IF OLD.payment_status = 'paid' THEN
      UPDATE cars SET status = 'available' 
      WHERE id = OLD.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = OLD.car_id 
        AND payment_status = 'paid'
      );
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';