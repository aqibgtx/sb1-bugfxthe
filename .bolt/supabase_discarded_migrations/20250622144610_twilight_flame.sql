/*
  # Booking and Payment Status Management System

  1. Schema Updates
    - Update booking_status enum to only allow 'approved' and 'rejected'
    - Update payment_status enum to only allow 'approved' and 'rejected'
    - Add payment_completion_status for Stripe webhook updates
    - Add audit logging for status changes

  2. Security
    - Prevent automated updates to manual status fields
    - Add validation functions for status changes
    - Create audit trail for all status modifications

  3. Webhook Processing
    - Stripe webhooks only update payment_completion_status
    - No automatic updates to booking or payment status
    - Maintain separation between payment completion and approval
*/

-- Create audit log table for status changes
CREATE TABLE IF NOT EXISTS status_change_audit (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid REFERENCES auth.users(id),
  change_source text NOT NULL, -- 'manual', 'webhook', 'system'
  change_reason text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE status_change_audit ENABLE ROW LEVEL SECURITY;

-- Admin can view all audit logs
CREATE POLICY "Admin can view all audit logs" ON status_change_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.registration_status = 'approved'
    )
  );

-- Update booking_status enum to only allow approved/rejected
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_booking_status_check 
  CHECK (booking_status IN ('approved', 'rejected'));

-- Update payment_status enum to only allow approved/rejected  
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check 
  CHECK (payment_status IN ('approved', 'rejected'));

-- Ensure payment_completion_status exists and is separate
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_completion_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_completion_status_check 
  CHECK (payment_completion_status IN ('pending', 'paid', 'failed', 'cancelled', 'expired'));

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log booking_status changes
  IF TG_TABLE_NAME = 'bookings' AND OLD.booking_status IS DISTINCT FROM NEW.booking_status THEN
    INSERT INTO status_change_audit (
      table_name, record_id, field_name, old_value, new_value, 
      changed_by, change_source, change_reason
    ) VALUES (
      'bookings', NEW.id, 'booking_status', OLD.booking_status, NEW.booking_status,
      (SELECT id FROM users WHERE auth_id = auth.uid()), 'manual', 
      'Manual booking status update'
    );
  END IF;

  -- Log payment_status changes
  IF TG_TABLE_NAME = 'bookings' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO status_change_audit (
      table_name, record_id, field_name, old_value, new_value, 
      changed_by, change_source, change_reason
    ) VALUES (
      'bookings', NEW.id, 'payment_status', OLD.payment_status, NEW.payment_status,
      (SELECT id FROM users WHERE auth_id = auth.uid()), 'manual', 
      'Manual payment status update'
    );
  END IF;

  -- Log payment_completion_status changes
  IF TG_TABLE_NAME = 'payments' AND OLD.payment_completion_status IS DISTINCT FROM NEW.payment_completion_status THEN
    INSERT INTO status_change_audit (
      table_name, record_id, field_name, old_value, new_value, 
      changed_by, change_source, change_reason
    ) VALUES (
      'payments', NEW.id, 'payment_completion_status', 
      OLD.payment_completion_status::text, NEW.payment_completion_status::text,
      NULL, 'webhook', 'Stripe webhook payment completion update'
    );
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS log_booking_status_change_trigger ON bookings;
CREATE TRIGGER log_booking_status_change_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_payment_status_change_trigger ON payments;
CREATE TRIGGER log_payment_status_change_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- Function to validate manual status changes
CREATE OR REPLACE FUNCTION validate_manual_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate booking_status changes
  IF TG_TABLE_NAME = 'bookings' AND OLD.booking_status IS DISTINCT FROM NEW.booking_status THEN
    -- Only allow approved/rejected values
    IF NEW.booking_status NOT IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'Invalid booking_status. Only "approved" or "rejected" are allowed.';
    END IF;
    
    -- Ensure change is made by authorized user
    IF NOT EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'staff')
      AND u.registration_status = 'approved'
    ) THEN
      RAISE EXCEPTION 'Unauthorized to change booking status.';
    END IF;
  END IF;

  -- Validate payment_status changes
  IF TG_TABLE_NAME = 'bookings' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    -- Only allow approved/rejected values
    IF NEW.payment_status NOT IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'Invalid payment_status. Only "approved" or "rejected" are allowed.';
    END IF;
    
    -- Ensure change is made by authorized user
    IF NOT EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'staff')
      AND u.registration_status = 'approved'
    ) THEN
      RAISE EXCEPTION 'Unauthorized to change payment status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create validation triggers
DROP TRIGGER IF EXISTS validate_booking_payment_status_trigger ON bookings;
CREATE TRIGGER validate_booking_payment_status_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION validate_manual_status_change();

-- Function for Stripe webhook payment completion (ONLY updates payment_completion_status)
CREATE OR REPLACE FUNCTION process_stripe_webhook_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- This function ONLY handles payment_completion_status updates from webhooks
  -- It does NOT modify booking_status or payment_status
  
  -- Validate that only payment_completion_status is being updated by webhook
  IF OLD.payment_completion_status IS DISTINCT FROM NEW.payment_completion_status THEN
    -- Log the webhook update
    INSERT INTO status_change_audit (
      table_name, record_id, field_name, old_value, new_value, 
      changed_by, change_source, change_reason
    ) VALUES (
      'payments', NEW.id, 'payment_completion_status', 
      OLD.payment_completion_status::text, NEW.payment_completion_status::text,
      NULL, 'webhook', 
      'Stripe webhook payment completion status update'
    );
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create webhook processing trigger
DROP TRIGGER IF EXISTS process_stripe_webhook_trigger ON payments;
CREATE TRIGGER process_stripe_webhook_trigger
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION process_stripe_webhook_payment();

-- Remove old triggers that automatically updated statuses
DROP TRIGGER IF EXISTS handle_stripe_payment_completion_trigger ON payments;
DROP TRIGGER IF EXISTS booking_payment_consistency_trigger ON bookings;
DROP TRIGGER IF EXISTS update_car_status_trigger ON bookings;

-- Create new car status update function that only responds to manual approvals
CREATE OR REPLACE FUNCTION update_car_status_manual()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update car status when booking_status is manually changed to approved
  IF NEW.booking_status = 'approved' AND OLD.booking_status != 'approved' THEN
    UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
  END IF;
  
  -- Only update car status when booking_status is manually changed to rejected
  IF NEW.booking_status = 'rejected' AND OLD.booking_status != 'rejected' THEN
    -- Only mark as available if no other approved bookings exist
    UPDATE cars SET status = 'available' 
    WHERE id = NEW.car_id 
    AND NOT EXISTS (
      SELECT 1 FROM bookings 
      WHERE car_id = NEW.car_id 
      AND booking_status = 'approved'
      AND id != NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create manual car status update trigger
CREATE TRIGGER update_car_status_manual_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_car_status_manual();

-- Function to ensure payment exists for approved bookings
CREATE OR REPLACE FUNCTION ensure_payment_exists_for_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking is approved, ensure a payment record exists
  IF NEW.booking_status = 'approved' AND OLD.booking_status != 'approved' THEN
    -- Check if payment record exists
    IF NOT EXISTS (SELECT 1 FROM payments WHERE booking_id = NEW.id) THEN
      -- Create payment record if it doesn't exist
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

-- Create payment existence trigger
CREATE TRIGGER ensure_payment_exists_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW 
  WHEN (NEW.booking_status = 'approved' AND OLD.booking_status != 'approved')
  EXECUTE FUNCTION ensure_payment_exists_for_booking();

-- Update existing data to conform to new constraints
UPDATE bookings SET 
  booking_status = CASE 
    WHEN booking_status IN ('pending_approval', 'cancel_pending', 'cancelled') THEN 'rejected'
    WHEN booking_status IN ('approved', 'ongoing', 'completed') THEN 'approved'
    ELSE 'rejected'
  END,
  payment_status = CASE 
    WHEN payment_status IN ('pending', 'payment_completed', 'cancelled', 'refunded', 'rejected') THEN 'rejected'
    WHEN payment_status IN ('paid', 'approved', 'completed') THEN 'approved'
    ELSE 'rejected'
  END;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_status_change_audit_table_record ON status_change_audit(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_status_change_audit_created_at ON status_change_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_completion_status ON payments(payment_completion_status);

-- Create view for payment status overview
CREATE OR REPLACE VIEW payment_status_overview AS
SELECT 
  b.id as booking_id,
  b.booking_number,
  b.booking_status,
  b.payment_status,
  p.payment_completion_status,
  p.admin_approval_status,
  p.stripe_session_id,
  p.stripe_payment_intent_id,
  p.stripe_webhook_received_at,
  c.name as customer_name,
  s.name as staff_name,
  car.brand || ' ' || car.make as car_details
FROM bookings b
LEFT JOIN payments p ON b.id = p.booking_id
LEFT JOIN users c ON b.customer_id = c.id
LEFT JOIN users s ON b.staff_id = s.id
LEFT JOIN cars car ON b.car_id = car.id;

-- Grant access to the view
GRANT SELECT ON payment_status_overview TO authenticated;