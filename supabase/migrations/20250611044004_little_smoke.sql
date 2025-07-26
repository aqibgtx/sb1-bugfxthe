/*
  # Simplify Booking Status System

  1. Schema Changes
    - Remove the 'status' column from bookings table
    - Use only 'payment_status' to track booking progression
    - Update payment_status enum to include all necessary states
    - Update RLS policies and constraints

  2. Status Flow
    - pending: Initial booking state, awaiting payment
    - paid: Payment confirmed, booking active
    - completed: Rental completed successfully
    - cancelled: Booking cancelled
    - refunded: Payment refunded

  3. Data Migration
    - Migrate existing status data to payment_status
    - Clean up any inconsistencies
*/

-- First, let's see what payment_status values we currently support
-- and expand them to cover all booking states
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

-- Add new payment status values that cover the full booking lifecycle
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'completed', 'cancelled', 'refunded'));

-- Migrate existing data: combine status and payment_status into single payment_status
UPDATE bookings SET payment_status = 
  CASE 
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'ongoing' AND payment_status = 'paid' THEN 'paid'
    WHEN status = 'approved' AND payment_status = 'paid' THEN 'paid'
    WHEN payment_status = 'refunded' THEN 'refunded'
    ELSE 'pending'
  END;

-- Remove the status column as we're consolidating into payment_status
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings DROP COLUMN IF EXISTS status;

-- Update the cars table to use a simpler status system
-- Cars should be either 'available' or 'rented' (maintenance and sold remain)
ALTER TABLE cars DROP CONSTRAINT IF EXISTS cars_status_check;
ALTER TABLE cars ADD CONSTRAINT cars_status_check 
  CHECK (status IN ('available', 'rented', 'maintenance', 'sold'));

-- Create a function to automatically update car status based on bookings
CREATE OR REPLACE FUNCTION update_car_status_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking payment status changes, update car status accordingly
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If booking is paid, mark car as rented
    IF NEW.payment_status = 'paid' THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
    -- If booking is completed or cancelled, mark car as available
    ELSIF NEW.payment_status IN ('completed', 'cancelled', 'refunded') THEN
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

-- Create trigger for automatic car status updates
DROP TRIGGER IF EXISTS update_car_status_trigger ON bookings;
CREATE TRIGGER update_car_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_car_status_from_booking();

-- Update RLS policies to use payment_status instead of status
DROP POLICY IF EXISTS "Users can read own bookings" ON bookings;
CREATE POLICY "Users can read own bookings" ON bookings
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

-- Update existing bookings to ensure car statuses are correct
UPDATE cars SET status = 'rented' 
WHERE id IN (
  SELECT DISTINCT car_id FROM bookings 
  WHERE payment_status = 'paid'
);

UPDATE cars SET status = 'available' 
WHERE status = 'rented' 
AND id NOT IN (
  SELECT DISTINCT car_id FROM bookings 
  WHERE payment_status = 'paid'
);