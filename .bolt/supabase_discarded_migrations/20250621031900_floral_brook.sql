/*
  # Add Payment Completion Status

  1. Schema Changes
    - Add 'payment_received' status to payment_status enum
    - Update booking status flow to handle payment completion
    - Add payment receipt tracking fields

  2. Status Flow
    - pending: Initial booking state, awaiting payment
    - payment_received: Payment completed via Stripe, awaiting admin approval
    - paid: Payment approved by admin, booking active
    - completed: Rental completed successfully
    - cancelled: Booking cancelled
    - refunded: Payment refunded
    - rejected: Payment rejected by admin

  3. Payment Tracking
    - Add fields to track payment receipt details
    - Store Stripe session/payment intent information
*/

-- Add 'payment_received' to the payment_status enum
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check 
  CHECK (payment_status IN ('pending', 'payment_received', 'paid', 'completed', 'cancelled', 'refunded', 'rejected'));

-- Add payment receipt tracking fields to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_received_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_details jsonb;

-- Update car status function to handle payment_received status
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

-- Add indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id ON payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_received_at ON payments(payment_received_at);