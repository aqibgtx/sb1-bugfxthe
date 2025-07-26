/*
  # Fix Car Status Update for Booking Approval

  1. Schema Changes
    - Add back booking_status column to track booking approval separately from payment
    - Update constraints and triggers to handle both booking and payment status
    - Ensure car status updates when booking is approved (independent of payment)

  2. Status Flow
    - booking_status: pending_approval -> approved -> ongoing -> completed -> cancelled
    - payment_status: pending -> paid -> completed -> cancelled -> refunded -> rejected
    - Car becomes 'rented' when booking_status = 'approved' (regardless of payment_status)

  3. Data Migration
    - Migrate existing data to use both status fields properly
    - Update triggers and functions
*/

-- Add booking_status column back to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_status text 
  CHECK (booking_status IN ('pending_approval', 'approved', 'ongoing', 'completed', 'cancel_pending', 'cancelled')) 
  DEFAULT 'pending_approval';

-- Migrate existing data: set booking_status based on current payment_status
UPDATE bookings SET booking_status = 
  CASE 
    WHEN payment_status = 'paid' THEN 'approved'
    WHEN payment_status = 'completed' THEN 'completed'
    WHEN payment_status = 'cancelled' THEN 'cancelled'
    WHEN payment_status = 'rejected' THEN 'cancelled'
    ELSE 'pending_approval'
  END
WHERE booking_status IS NULL OR booking_status = 'pending_approval';

-- Update the car status function to respond to booking_status changes
CREATE OR REPLACE FUNCTION update_car_status_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking status changes, update car status accordingly
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If booking is approved, mark car as rented (regardless of payment status)
    IF NEW.booking_status IN ('approved', 'ongoing') THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
    -- If booking is completed or cancelled, mark car as available
    ELSIF NEW.booking_status IN ('completed', 'cancelled') THEN
      -- Only mark as available if no other active bookings exist
      UPDATE cars SET status = 'available' 
      WHERE id = NEW.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = NEW.car_id 
        AND booking_status IN ('approved', 'ongoing')
        AND id != NEW.id
      );
    END IF;
  END IF;
  
  -- Handle deletion
  IF TG_OP = 'DELETE' THEN
    -- If an approved booking is deleted, check if car should be available
    IF OLD.booking_status IN ('approved', 'ongoing') THEN
      UPDATE cars SET status = 'available' 
      WHERE id = OLD.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = OLD.car_id 
        AND booking_status IN ('approved', 'ongoing')
      );
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update the cancellation request processing function
CREATE OR REPLACE FUNCTION process_approved_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- When a cancellation request is approved, cancel the booking
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE bookings 
    SET 
      booking_status = 'cancelled',
      payment_status = 'cancelled',
      notes = COALESCE(notes, '') || ' | Cancelled by admin approval. Reason: ' || NEW.reason,
      updated_at = now()
    WHERE id = NEW.booking_id;
    
    -- Set approval details
    NEW.approved_by = (SELECT id FROM users WHERE auth_id = auth.uid());
    NEW.approved_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update the payment rejection function to only affect payment_status
CREATE OR REPLACE FUNCTION handle_payment_rejection()
RETURNS TRIGGER AS $$
BEGIN
  -- When a payment is deleted (rejected), update only the payment status
  IF TG_OP = 'DELETE' THEN
    -- Update only the payment status to rejected (keep booking_status as is)
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

-- Update booking consistency function
CREATE OR REPLACE FUNCTION ensure_booking_payment_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking payment_status is updated to rejected or cancelled, ensure no approved payments exist
  IF NEW.payment_status IN ('rejected', 'cancelled') AND OLD.payment_status NOT IN ('rejected', 'cancelled') THEN
    -- Delete any unapproved payments for this booking
    DELETE FROM payments 
    WHERE booking_id = NEW.id AND approved = false;
  END IF;
  
  -- When booking_status changes to cancelled, also cancel payment_status if not already processed
  IF NEW.booking_status = 'cancelled' AND OLD.booking_status != 'cancelled' THEN
    IF NEW.payment_status NOT IN ('paid', 'completed', 'refunded') THEN
      NEW.payment_status = 'cancelled';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_combined_status ON bookings(booking_status, payment_status);

-- Update existing cars to have correct status based on current bookings
UPDATE cars SET status = 'rented' 
WHERE id IN (
  SELECT DISTINCT car_id FROM bookings 
  WHERE booking_status IN ('approved', 'ongoing')
);

UPDATE cars SET status = 'available' 
WHERE status = 'rented' 
AND id NOT IN (
  SELECT DISTINCT car_id FROM bookings 
  WHERE booking_status IN ('approved', 'ongoing')
);