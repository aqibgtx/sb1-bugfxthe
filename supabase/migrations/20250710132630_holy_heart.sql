/*
  # Allow Admin to Extend All Bookings Including Handed Over

  1. Updates
    - Update extend_booking function to allow extension of handed_over bookings
    - Ensure admins can extend any booking regardless of who created it
    - Update overdue tracking to include extended and handed_over bookings

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control for extension functionality
*/

-- Update the extend_booking function to allow extension of handed_over bookings
CREATE OR REPLACE FUNCTION extend_booking(
  p_booking_id uuid,
  p_extension_days integer,
  p_daily_rate decimal(10,2),
  p_created_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record bookings%ROWTYPE;
  extension_amount decimal(10,2);
  new_end_date date;
  extension_id uuid;
  result json;
BEGIN
  -- Get the booking record
  SELECT * INTO booking_record
  FROM bookings
  WHERE id = p_booking_id;

  -- Check if booking exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Check if booking can be extended (now includes handed_over)
  IF booking_record.booking_status NOT IN ('approved', 'ongoing', 'handed_over', 'extended') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking cannot be extended in current status: ' || booking_record.booking_status
    );
  END IF;

  -- Calculate extension details
  extension_amount := p_extension_days * p_daily_rate;
  new_end_date := booking_record.end_date + (p_extension_days || ' days')::interval;

  -- Create extension record
  INSERT INTO booking_extensions (
    booking_id,
    original_end_date,
    extended_end_date,
    extension_days,
    daily_rate,
    extension_amount,
    payment_due_date,
    created_by
  ) VALUES (
    p_booking_id,
    booking_record.end_date,
    new_end_date,
    p_extension_days,
    p_daily_rate,
    extension_amount,
    new_end_date,
    p_created_by
  ) RETURNING id INTO extension_id;

  -- Update booking end_date and status to 'extended'
  UPDATE bookings 
  SET 
    end_date = new_end_date,
    total_days = total_days + p_extension_days,
    booking_status = 'extended',
    updated_at = now()
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'extension_id', extension_id,
    'new_end_date', new_end_date,
    'extension_amount', extension_amount,
    'original_status', booking_record.booking_status,
    'new_status', 'extended',
    'message', 'Booking extended successfully and status updated to Extended'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Update the car status function to handle 'extended' status properly
CREATE OR REPLACE FUNCTION update_car_status_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking status changes, update car status accordingly
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If booking is approved, ongoing, handed_over, or extended, mark car as rented
    IF NEW.booking_status IN ('approved', 'ongoing', 'handed_over', 'extended') THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
    -- If booking is completed or cancelled, mark car as available
    ELSIF NEW.booking_status IN ('completed', 'cancelled') THEN
      -- Only mark as available if no other active bookings exist
      UPDATE cars SET status = 'available' 
      WHERE id = NEW.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = NEW.car_id 
        AND booking_status IN ('approved', 'ongoing', 'handed_over', 'extended')
        AND id != NEW.id
      );
    END IF;
  END IF;
  
  -- Handle deletion
  IF TG_OP = 'DELETE' THEN
    -- If an active booking is deleted, check if car should be available
    IF OLD.booking_status IN ('approved', 'ongoing', 'handed_over', 'extended') THEN
      UPDATE cars SET status = 'available' 
      WHERE id = OLD.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = OLD.car_id 
        AND booking_status IN ('approved', 'ongoing', 'handed_over', 'extended')
      );
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update the overdue_bookings_view to include extended and handed_over bookings
DROP VIEW IF EXISTS overdue_bookings_view;
CREATE VIEW overdue_bookings_view AS
SELECT 
  b.id as booking_id,
  b.booking_number,
  b.customer_id,
  c.name as customer_name,
  c.email as customer_email,
  b.car_id,
  COALESCE(b.car_name, car.brand || ' ' || car.make) as car_name,
  COALESCE(b.car_plate_number, car.plate_number) as plate_number,
  b.start_date,
  b.end_date,
  EXTRACT(DAY FROM (now() - b.end_date::timestamp))::integer as days_overdue,
  b.total_amount,
  b.booking_status,
  b.payment_status,
  b.notes
FROM bookings b
JOIN users c ON b.customer_id = c.id
JOIN cars car ON b.car_id = car.id
WHERE 
  b.end_date < CURRENT_DATE 
  AND b.return_marked = false 
  AND b.booking_status IN ('approved', 'ongoing', 'handed_over', 'extended')
  AND b.payment_status NOT IN ('cancelled', 'rejected')
  AND b.booking_status != 'cancelled';

-- Grant access to the updated view
GRANT SELECT ON overdue_bookings_view TO authenticated;

-- Add comment to document the changes
COMMENT ON FUNCTION extend_booking(uuid, integer, decimal, uuid) IS 'Allows extension of bookings in approved, ongoing, handed_over, or extended status. Updates booking status to extended.';