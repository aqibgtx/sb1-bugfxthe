/*
  # Update Payment Rejection to Cancel Bookings

  1. Database Function
    - Create function to automatically cancel bookings when payments are rejected
    - Ensure data consistency between payments and bookings

  2. Trigger
    - Add trigger to automatically update booking status when payment is deleted
    - Maintain referential integrity

  3. Policy Updates
    - Ensure proper access control for payment rejection workflow
*/

-- Function to handle payment rejection and booking cancellation
CREATE OR REPLACE FUNCTION handle_payment_rejection()
RETURNS TRIGGER AS $$
BEGIN
  -- When a payment is deleted (rejected), update the associated booking
  IF TG_OP = 'DELETE' THEN
    -- Update the booking status to cancelled
    UPDATE bookings 
    SET 
      payment_status = 'cancelled',
      notes = COALESCE(notes, '') || ' | Payment rejected and booking cancelled automatically.',
      updated_at = now()
    WHERE id = OLD.booking_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for payment deletion
DROP TRIGGER IF EXISTS payment_rejection_trigger ON payments;
CREATE TRIGGER payment_rejection_trigger
  AFTER DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION handle_payment_rejection();

-- Function to ensure booking status consistency
CREATE OR REPLACE FUNCTION ensure_booking_payment_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking payment_status is updated to cancelled, ensure no approved payments exist
  IF NEW.payment_status = 'cancelled' AND OLD.payment_status != 'cancelled' THEN
    -- Delete any unapproved payments for this booking
    DELETE FROM payments 
    WHERE booking_id = NEW.id AND approved = false;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for booking status updates
DROP TRIGGER IF EXISTS booking_payment_consistency_trigger ON bookings;
CREATE TRIGGER booking_payment_consistency_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION ensure_booking_payment_consistency();

-- Add index for better performance on payment-booking queries
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Update RLS policies to ensure proper access for rejection workflow
DROP POLICY IF EXISTS "Admin can manage payments for rejection" ON payments;
CREATE POLICY "Admin can manage payments for rejection" ON payments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );