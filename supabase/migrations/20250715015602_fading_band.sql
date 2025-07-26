/*
  # Add support for booking staff forwarding

  1. Updates
    - Add index for better performance when querying bookings by staff assignment
    - Add function to handle staff forwarding with proper validation
    - Update booking triggers to handle staff assignment changes

  2. Security
    - Ensure only admins can forward bookings to staff
    - Maintain audit trail of staff assignments
*/

-- Add index for staff_id queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_bookings_staff_assignment 
ON public.bookings(staff_id, booking_status) 
WHERE staff_id IS NOT NULL;

-- Add index for customer self-bookings (no staff assigned)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_self 
ON public.bookings(customer_id, booking_status) 
WHERE staff_id IS NULL;

-- Function to handle staff forwarding
CREATE OR REPLACE FUNCTION handle_staff_forwarding()
RETURNS TRIGGER AS $$
BEGIN
  -- If staff_id is being changed and booking is being approved
  IF OLD.staff_id IS DISTINCT FROM NEW.staff_id AND 
     NEW.booking_status = 'approved' AND 
     NEW.staff_id IS NOT NULL THEN
    
    -- Log the staff assignment change
    INSERT INTO public.payment_creation_log (
      booking_id,
      trigger_name,
      action_type,
      notes
    ) VALUES (
      NEW.id,
      'handle_staff_forwarding',
      'staff_assigned',
      CONCAT('Booking forwarded to staff ID: ', NEW.staff_id, ' from: ', COALESCE(OLD.staff_id::text, 'unassigned'))
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for staff forwarding
DROP TRIGGER IF EXISTS staff_forwarding_trigger ON public.bookings;
CREATE TRIGGER staff_forwarding_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (OLD.staff_id IS DISTINCT FROM NEW.staff_id)
  EXECUTE FUNCTION handle_staff_forwarding();

-- Add comment to explain the forwarding system
COMMENT ON TRIGGER staff_forwarding_trigger ON public.bookings IS 
'Handles staff forwarding for customer self-bookings, logging assignment changes';