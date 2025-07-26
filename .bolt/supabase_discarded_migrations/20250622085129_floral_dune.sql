/*
  # Add Payment Completion Status System

  1. Schema Changes
    - Add payment_completion_status to track actual payment completion from Stripe
    - Separate from admin approval workflow
    - Update webhook handling to use new status

  2. Status Flow
    - payment_completion_status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired'
    - admin_approval_status: 'pending' | 'approved' | 'rejected'
    - Only show payments in admin portal that have payment_completion_status = 'completed'

  3. Webhook Integration
    - Stripe webhooks update payment_completion_status
    - Admin approval is separate workflow for completed payments
*/

-- Add payment completion status enum
CREATE TYPE payment_completion_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'expired');
CREATE TYPE admin_approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add new columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_completion_status payment_completion_status DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_approval_status admin_approval_status DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_webhook_received_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_webhook_data jsonb;

-- Update existing payments to have proper completion status
UPDATE payments SET 
  payment_completion_status = CASE 
    WHEN payment_received_at IS NOT NULL THEN 'completed'::payment_completion_status
    ELSE 'pending'::payment_completion_status
  END,
  admin_approval_status = CASE 
    WHEN approved = true THEN 'approved'::admin_approval_status
    ELSE 'pending'::admin_approval_status
  END;

-- Add new booking payment status values
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check 
  CHECK (payment_status IN ('pending', 'payment_completed', 'approved', 'completed', 'cancelled', 'refunded', 'rejected'));

-- Update existing bookings
UPDATE bookings SET payment_status = 
  CASE 
    WHEN payment_status = 'payment_received' THEN 'payment_completed'
    WHEN payment_status = 'paid' THEN 'approved'
    ELSE payment_status
  END;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_completion_status ON payments(payment_completion_status);
CREATE INDEX IF NOT EXISTS idx_payments_admin_approval ON payments(admin_approval_status);
CREATE INDEX IF NOT EXISTS idx_payments_webhook_received ON payments(stripe_webhook_received_at);

-- Update RLS policies to only show completed payments to admin
DROP POLICY IF EXISTS "Staff can manage payments" ON payments;
CREATE POLICY "Staff can manage completed payments" ON payments
  FOR ALL TO authenticated
  USING (
    (payment_completion_status = 'completed' AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    ))
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

-- Function to handle payment completion from webhooks
CREATE OR REPLACE FUNCTION handle_stripe_payment_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment completion status changes to completed, update booking
  IF NEW.payment_completion_status = 'completed' AND OLD.payment_completion_status != 'completed' THEN
    UPDATE bookings 
    SET 
      payment_status = 'payment_completed',
      notes = COALESCE(notes, '') || ' | Payment completed via Stripe webhook.',
      updated_at = now()
    WHERE id = NEW.booking_id;
  END IF;
  
  -- When admin approves completed payment, update booking to approved
  IF NEW.admin_approval_status = 'approved' AND OLD.admin_approval_status != 'approved' 
     AND NEW.payment_completion_status = 'completed' THEN
    UPDATE bookings 
    SET 
      payment_status = 'approved',
      notes = COALESCE(notes, '') || ' | Payment approved by admin.',
      updated_at = now()
    WHERE id = NEW.booking_id;
  END IF;
  
  -- When admin rejects completed payment, update booking to rejected
  IF NEW.admin_approval_status = 'rejected' AND OLD.admin_approval_status != 'rejected' THEN
    UPDATE bookings 
    SET 
      payment_status = 'rejected',
      notes = COALESCE(notes, '') || ' | Payment rejected by admin.',
      updated_at = now()
    WHERE id = NEW.booking_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for payment completion handling
DROP TRIGGER IF EXISTS handle_stripe_payment_completion_trigger ON payments;
CREATE TRIGGER handle_stripe_payment_completion_trigger
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION handle_stripe_payment_completion();

-- Update car status function to use new payment flow
CREATE OR REPLACE FUNCTION update_car_status_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking status changes, update car status accordingly
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If booking payment is approved, mark car as rented
    IF NEW.payment_status = 'approved' THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
    -- If booking is completed or cancelled, mark car as available
    ELSIF NEW.payment_status IN ('completed', 'cancelled', 'rejected') THEN
      -- Only mark as available if no other active bookings exist
      UPDATE cars SET status = 'available' 
      WHERE id = NEW.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = NEW.car_id 
        AND payment_status = 'approved'
        AND id != NEW.id
      );
    END IF;
  END IF;
  
  -- Handle deletion
  IF TG_OP = 'DELETE' THEN
    -- If an approved booking is deleted, check if car should be available
    IF OLD.payment_status = 'approved' THEN
      UPDATE cars SET status = 'available' 
      WHERE id = OLD.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = OLD.car_id 
        AND payment_status = 'approved'
      );
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';