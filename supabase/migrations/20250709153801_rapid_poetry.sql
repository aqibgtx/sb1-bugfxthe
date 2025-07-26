/*
  # Fix Car Status Update on Booking Approval

  1. Function Updates
    - Update the existing car status function to properly handle booking approval
    - Ensure car status is set to 'rented' when booking_status = 'approved'
    - Handle cancellations and completions properly

  2. Trigger Updates
    - Ensure the trigger fires on booking_status changes
    - Maintain existing functionality for other status changes
*/

-- Update the car status function to properly handle booking approval
CREATE OR REPLACE FUNCTION update_car_status_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking status changes, update car status accordingly
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If booking is approved, mark car as rented (this is the key fix)
    IF NEW.booking_status = 'approved' THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
    -- If booking is ongoing (handover completed), keep car as rented
    ELSIF NEW.booking_status = 'ongoing' THEN
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
    -- If an approved or ongoing booking is deleted, check if car should be available
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

-- Ensure the trigger is properly set up to fire on booking_status changes
DROP TRIGGER IF EXISTS update_car_status_trigger ON bookings;
CREATE TRIGGER update_car_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_car_status_from_booking();

-- Update existing cars to have correct status based on current bookings
-- Set cars to 'rented' if they have approved or ongoing bookings
UPDATE cars SET status = 'rented' 
WHERE id IN (
  SELECT DISTINCT car_id FROM bookings 
  WHERE booking_status IN ('approved', 'ongoing')
);

-- Set cars to 'available' if they don't have any approved or ongoing bookings
UPDATE cars SET status = 'available' 
WHERE status = 'rented' 
AND id NOT IN (
  SELECT DISTINCT car_id FROM bookings 
  WHERE booking_status IN ('approved', 'ongoing')
);

-- Add index for better performance on car status queries
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);

-- Add comment to document the car status logic
COMMENT ON FUNCTION update_car_status_from_booking() IS 'Updates car status based on booking status changes: approved/ongoing = rented, completed/cancelled = available';