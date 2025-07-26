/*
  # Separate Booking and Payment Status System

  1. Schema Changes
    - Add back 'booking_status' column to bookings table
    - Keep 'payment_status' for payment tracking
    - Update constraints and triggers accordingly

  2. Status Flow
    Booking Status:
    - pending: Initial booking state, awaiting admin approval
    - approved: Admin approved the booking
    - active: Booking is currently active (car handed over)
    - completed: Booking completed successfully
    - cancelled: Booking cancelled

    Payment Status:
    - pending: Awaiting payment proof upload
    - paid: Payment confirmed by admin
    - refunded: Payment refunded
    - rejected: Payment rejected

  3. Workflow
    - Staff creates booking (booking_status: pending, payment_status: pending)
    - Admin can approve booking independently of payment
    - Admin can approve payment independently of booking
    - Car status updates based on both statuses
*/

-- Add booking_status column back to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'booking_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN booking_status text DEFAULT 'pending';
  END IF;
END $$;

-- Update booking_status constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_booking_status_check 
  CHECK (booking_status IN ('pending', 'approved', 'active', 'completed', 'cancelled'));

-- Update payment_status constraint to be more specific to payments
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'refunded', 'rejected'));

-- Set default values for existing records
UPDATE bookings SET booking_status = 
  CASE 
    WHEN payment_status = 'completed' THEN 'completed'
    WHEN payment_status = 'cancelled' THEN 'cancelled'
    WHEN payment_status = 'rejected' THEN 'cancelled'
    WHEN payment_status = 'paid' THEN 'approved'
    ELSE 'pending'
  END
WHERE booking_status IS NULL;

-- Reset payment_status to be more payment-specific
UPDATE bookings SET payment_status = 
  CASE 
    WHEN payment_status = 'completed' THEN 'paid'
    WHEN payment_status = 'cancelled' THEN 'pending'
    WHEN payment_status = 'rejected' THEN 'rejected'
    ELSE payment_status
  END;

-- Update car status function to consider both booking and payment status
CREATE OR REPLACE FUNCTION update_car_status_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking or payment status changes, update car status accordingly
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Car is rented when booking is approved AND payment is paid
    IF NEW.booking_status = 'approved' AND NEW.payment_status = 'paid' THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
    -- Car is active when booking is active (regardless of payment for ongoing rentals)
    ELSIF NEW.booking_status = 'active' THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
    -- Car becomes available when booking is completed or cancelled
    ELSIF NEW.booking_status IN ('completed', 'cancelled') THEN
      -- Only mark as available if no other active bookings exist
      UPDATE cars SET status = 'available' 
      WHERE id = NEW.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = NEW.car_id 
        AND booking_status IN ('approved', 'active')
        AND payment_status = 'paid'
        AND id != NEW.id
      );
    END IF;
  END IF;
  
  -- Handle deletion
  IF TG_OP = 'DELETE' THEN
    -- If an active booking is deleted, check if car should be available
    IF OLD.booking_status IN ('approved', 'active') THEN
      UPDATE cars SET status = 'available' 
      WHERE id = OLD.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = OLD.car_id 
        AND booking_status IN ('approved', 'active')
        AND payment_status = 'paid'
      );
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update payment rejection function to only affect payment_status
CREATE OR REPLACE FUNCTION handle_payment_rejection()
RETURNS TRIGGER AS $$
BEGIN
  -- When a payment is deleted (rejected), update only the payment status
  IF TG_OP = 'DELETE' THEN
    -- Update only the payment status to rejected
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

-- Update cancellation approval function to set booking_status
CREATE OR REPLACE FUNCTION process_approved_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- When a cancellation request is approved, cancel the booking
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE bookings 
    SET 
      booking_status = 'cancelled',
      notes = COALESCE(notes, '') || ' | Booking cancelled by admin approval. Reason: ' || NEW.reason,
      updated_at = now()
    WHERE id = NEW.booking_id;
    
    -- Set approval details
    NEW.approved_by = (SELECT id FROM users WHERE auth_id = auth.uid());
    NEW.approved_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update booking consistency function
CREATE OR REPLACE FUNCTION ensure_booking_payment_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking is cancelled, handle payment cleanup
  IF NEW.booking_status = 'cancelled' AND OLD.booking_status != 'cancelled' THEN
    -- Delete any unapproved payments for this booking
    DELETE FROM payments 
    WHERE booking_id = NEW.id AND approved = false;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_combined_status ON bookings(booking_status, payment_status);