/*
  # Add Payment Status Logging System

  1. New Functions
    - Add function to log booking payment status changes
    - Ensure payment exists for approved bookings
    - Handle Stripe payment completion separately from admin approval

  2. Triggers
    - Log all payment status changes for audit trail
    - Ensure payment record exists when booking is approved
    - Maintain separation between Stripe webhooks and admin actions

  3. Status Management
    - booking_status: Manual admin approval for booking requests
    - payment_status: Manual admin approval for payment completion
    - payment_completion_status: Automatic Stripe webhook updates only
*/

-- Function to log booking payment status changes
CREATE OR REPLACE FUNCTION log_booking_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the status change for audit purposes
  INSERT INTO public.logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by,
    created_at
  ) VALUES (
    'bookings',
    NEW.id,
    'payment_status_change',
    jsonb_build_object('payment_status', OLD.payment_status),
    jsonb_build_object('payment_status', NEW.payment_status),
    auth.uid(),
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If logs table doesn't exist, just continue without logging
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to ensure payment exists for approved bookings
CREATE OR REPLACE FUNCTION ensure_payment_exists_for_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking is approved, ensure a payment record exists
  IF NEW.booking_status = 'approved' AND OLD.booking_status != 'approved' THEN
    -- Check if payment record already exists
    IF NOT EXISTS (
      SELECT 1 FROM payments WHERE booking_id = NEW.id
    ) THEN
      -- Create a payment record with pending status
      INSERT INTO payments (
        booking_id,
        amount,
        payment_method_code,
        payment_completion_status,
        admin_approval_status,
        notes
      ) VALUES (
        NEW.id,
        NEW.total_amount,
        'PENDING',
        'pending',
        'pending',
        'Payment record created automatically when booking was approved'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for logging and payment creation
DROP TRIGGER IF EXISTS log_booking_payment_status_change_trigger ON bookings;
CREATE TRIGGER log_booking_payment_status_change_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION log_booking_payment_status_change();

DROP TRIGGER IF EXISTS ensure_payment_exists_trigger ON bookings;
CREATE TRIGGER ensure_payment_exists_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.booking_status = 'approved' AND OLD.booking_status != 'approved')
  EXECUTE FUNCTION ensure_payment_exists_for_booking();

-- Add unique constraint to ensure one payment per booking
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_booking_id_unique;
ALTER TABLE payments ADD CONSTRAINT payments_booking_id_unique UNIQUE (booking_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_id_unique ON payments(booking_id);

-- Update existing bookings to ensure they have payment records if approved
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
  CASE 
    WHEN b.payment_status = 'approved' THEN 'approved'::admin_approval_status
    ELSE 'pending'::admin_approval_status
  END,
  'Payment record created during migration for existing booking',
  b.created_at
FROM bookings b
WHERE b.booking_status = 'approved'
AND NOT EXISTS (
  SELECT 1 FROM payments p WHERE p.booking_id = b.id
)
ON CONFLICT (booking_id) DO NOTHING;