/*
  # Fix Staff Cancellation Logic

  1. New Functions
    - Add function to check if booking has been cancelled before
    - Update cancellation request logic to handle subsequent cancellations

  2. Schema Updates
    - Add tracking for first-time vs subsequent cancellations
    - Update cancellation request policies

  3. Business Logic
    - Staff can cancel directly within 3 days (first time only)
    - All subsequent cancellations require admin approval
    - Paid bookings always require admin approval
*/

-- Function to check if a booking has been cancelled before
CREATE OR REPLACE FUNCTION has_booking_been_cancelled_before(booking_uuid uuid, staff_uuid uuid)
RETURNS boolean AS $$
DECLARE
  cancellation_count integer;
BEGIN
  SELECT COUNT(*)
  INTO cancellation_count
  FROM cancellation_requests
  WHERE booking_id = booking_uuid 
  AND staff_id = staff_uuid
  AND status IN ('approved', 'rejected');
  
  RETURN cancellation_count > 0;
END;
$$ language 'plpgsql';

-- Function to check if booking can be cancelled directly
CREATE OR REPLACE FUNCTION can_cancel_booking_directly(booking_uuid uuid, staff_uuid uuid)
RETURNS boolean AS $$
DECLARE
  booking_record RECORD;
  days_since_creation integer;
  has_been_cancelled_before boolean;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record
  FROM bookings
  WHERE id = booking_uuid;
  
  -- Check if booking exists
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if booking is paid/approved (always requires admin approval)
  IF booking_record.payment_status IN ('paid', 'approved', 'completed') THEN
    RETURN false;
  END IF;
  
  -- Check if booking is within 3 days
  days_since_creation := EXTRACT(DAY FROM (now() - booking_record.created_at));
  
  -- Check if booking has been cancelled before
  has_been_cancelled_before := has_booking_been_cancelled_before(booking_uuid, staff_uuid);
  
  -- Can cancel directly if within 3 days AND hasn't been cancelled before
  RETURN days_since_creation <= 3 AND NOT has_been_cancelled_before;
END;
$$ language 'plpgsql';

-- Update cancellation request insertion to mark subsequent cancellations
CREATE OR REPLACE FUNCTION mark_subsequent_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  previous_requests integer;
BEGIN
  -- Count previous cancellation requests for this booking by this staff
  SELECT COUNT(*)
  INTO previous_requests
  FROM cancellation_requests
  WHERE booking_id = NEW.booking_id 
  AND staff_id = NEW.staff_id
  AND id != NEW.id;
  
  -- If there are previous requests, mark this as subsequent
  IF previous_requests > 0 THEN
    NEW.reason := '[SUBSEQUENT CANCELLATION] ' || NEW.reason;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for marking subsequent cancellations
DROP TRIGGER IF EXISTS mark_subsequent_cancellation_trigger ON cancellation_requests;
CREATE TRIGGER mark_subsequent_cancellation_trigger
  BEFORE INSERT ON cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION mark_subsequent_cancellation();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_booking_been_cancelled_before(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_cancel_booking_directly(uuid, uuid) TO authenticated;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_booking_staff ON cancellation_requests(booking_id, staff_id);