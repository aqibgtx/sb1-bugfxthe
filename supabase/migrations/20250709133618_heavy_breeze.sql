/*
  # Add subsequent cancellation tracking

  1. New Function
    - `mark_subsequent_cancellation` - Marks cancellation requests as subsequent if staff has already requested cancellation for the same booking

  2. Trigger
    - Add trigger to automatically mark subsequent cancellation requests

  3. Features
    - Track if a staff member has already requested cancellation for a booking
    - Mark subsequent requests appropriately for admin visibility
*/

-- Function to mark subsequent cancellation requests
CREATE OR REPLACE FUNCTION mark_subsequent_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this staff member has already requested cancellation for this booking
  IF EXISTS (
    SELECT 1 FROM cancellation_requests 
    WHERE booking_id = NEW.booking_id 
    AND staff_id = NEW.staff_id 
    AND id != NEW.id
  ) THEN
    -- Mark this as a subsequent cancellation if not already marked
    IF NOT (NEW.reason LIKE '[SUBSEQUENT CANCELLATION]%') THEN
      NEW.reason = '[SUBSEQUENT CANCELLATION] ' || NEW.reason;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for marking subsequent cancellations
DROP TRIGGER IF EXISTS mark_subsequent_cancellation_trigger ON cancellation_requests;
CREATE TRIGGER mark_subsequent_cancellation_trigger
  BEFORE INSERT ON cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION mark_subsequent_cancellation();

-- Add indexes for better performance on cancellation request queries
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_booking_staff ON cancellation_requests(booking_id, staff_id);