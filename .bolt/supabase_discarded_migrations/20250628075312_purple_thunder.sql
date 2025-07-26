/*
  # Fix Car Return System for Instant Availability

  1. Schema Changes
    - Add handover tracking fields to bookings table
    - Update car status logic to handle handover and return properly

  2. Status Flow Updates
    - booking_status: pending_approval -> approved -> handed_over -> ongoing -> completed
    - Car becomes 'rented' when booking_status = 'approved'
    - Car becomes 'available' immediately when return_marked = true

  3. Triggers
    - Update car status immediately when car is returned
    - Handle handover tracking properly
*/

-- Add handover tracking fields to bookings table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'handover_marked'
  ) THEN
    ALTER TABLE bookings ADD COLUMN handover_marked boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'handover_photo_url'
  ) THEN
    ALTER TABLE bookings ADD COLUMN handover_photo_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'handover_time'
  ) THEN
    ALTER TABLE bookings ADD COLUMN handover_time timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'handover_by'
  ) THEN
    ALTER TABLE bookings ADD COLUMN handover_by uuid REFERENCES users(id);
  END IF;
END $$;

-- Update booking_status enum to include handover states
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_booking_status_check 
  CHECK (booking_status IN ('pending_approval', 'approved', 'handed_over', 'ongoing', 'completed', 'cancel_pending', 'cancelled'));

-- Create comprehensive car status update function
CREATE OR REPLACE FUNCTION update_car_status_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking status changes, update car status accordingly
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    
    -- HANDOVER: When booking is approved, mark car as rented
    IF NEW.booking_status = 'approved' AND (OLD.booking_status IS NULL OR OLD.booking_status != 'approved') THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
      RAISE NOTICE 'Car % marked as rented due to booking % approval', NEW.car_id, NEW.id;
    
    -- RETURN: When car is returned (return_marked = true), mark car as available IMMEDIATELY
    ELSIF NEW.return_marked = true AND (OLD.return_marked IS NULL OR OLD.return_marked = false) THEN
      -- Mark car as available immediately when returned
      UPDATE cars SET status = 'available' WHERE id = NEW.car_id;
      
      -- Update booking status to completed if payment is approved
      IF NEW.payment_status = 'approved' THEN
        NEW.booking_status = 'completed';
        NEW.payment_status = 'completed';
      END IF;
      
      RAISE NOTICE 'Car % marked as available due to return of booking %', NEW.car_id, NEW.id;
    
    -- CANCELLATION: When booking is cancelled, mark car as available
    ELSIF NEW.booking_status = 'cancelled' AND OLD.booking_status != 'cancelled' THEN
      -- Only mark as available if no other active bookings exist
      UPDATE cars SET status = 'available' 
      WHERE id = NEW.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = NEW.car_id 
        AND booking_status IN ('approved', 'handed_over', 'ongoing')
        AND return_marked = false
        AND id != NEW.id
      );
      
      RAISE NOTICE 'Car % marked as available due to booking % cancellation', NEW.car_id, NEW.id;
    
    -- COMPLETION: When booking is completed, ensure car is available
    ELSIF NEW.booking_status = 'completed' AND OLD.booking_status != 'completed' THEN
      -- Only mark as available if no other active bookings exist
      UPDATE cars SET status = 'available' 
      WHERE id = NEW.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = NEW.car_id 
        AND booking_status IN ('approved', 'handed_over', 'ongoing')
        AND return_marked = false
        AND id != NEW.id
      );
      
      RAISE NOTICE 'Car % marked as available due to booking % completion', NEW.car_id, NEW.id;
    END IF;
  END IF;
  
  -- Handle deletion
  IF TG_OP = 'DELETE' THEN
    -- If an active booking is deleted, check if car should be available
    IF OLD.booking_status IN ('approved', 'handed_over', 'ongoing') AND OLD.return_marked = false THEN
      UPDATE cars SET status = 'available' 
      WHERE id = OLD.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = OLD.car_id 
        AND booking_status IN ('approved', 'handed_over', 'ongoing')
        AND return_marked = false
      );
      
      RAISE NOTICE 'Car % marked as available due to active booking % deletion', OLD.car_id, OLD.id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS update_car_status_trigger ON bookings;
CREATE TRIGGER update_car_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_car_status_from_booking();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_handover_marked ON bookings(handover_marked);
CREATE INDEX IF NOT EXISTS idx_bookings_handover_time ON bookings(handover_time);
CREATE INDEX IF NOT EXISTS idx_bookings_handover_by ON bookings(handover_by);

-- Update existing cars to have correct status based on current bookings
-- Cars should be 'rented' if they have approved bookings that haven't been returned
UPDATE cars SET status = 'rented' 
WHERE id IN (
  SELECT DISTINCT car_id FROM bookings 
  WHERE booking_status IN ('approved', 'handed_over', 'ongoing')
  AND return_marked = false
);

-- Cars should be 'available' if they don't have any active bookings
UPDATE cars SET status = 'available' 
WHERE status = 'rented' 
AND id NOT IN (
  SELECT DISTINCT car_id FROM bookings 
  WHERE booking_status IN ('approved', 'handed_over', 'ongoing')
  AND return_marked = false
);

-- Add comments to document the new fields
COMMENT ON COLUMN bookings.handover_marked IS 'Whether the car has been handed over to customer by staff';
COMMENT ON COLUMN bookings.handover_photo_url IS 'Photo of the car during handover for verification';
COMMENT ON COLUMN bookings.handover_time IS 'Actual timestamp when car was handed over to customer';
COMMENT ON COLUMN bookings.handover_by IS 'Staff member who performed the handover';