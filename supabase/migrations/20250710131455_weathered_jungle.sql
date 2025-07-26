/*
  # Add 'extended' status to booking_status constraint

  1. Schema Changes
    - Add 'extended' as a valid booking_status value
    - Update the extend_booking function to set status to 'extended'
    - Ensure proper status flow for extended bookings

  2. Status Flow
    - When a booking is extended, booking_status changes from 'approved' to 'extended'
    - Extended bookings can still be extended further or completed
    - Car status remains 'rented' for extended bookings
*/

-- Drop the existing booking_status constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;

-- Add the updated constraint that includes 'extended'
ALTER TABLE bookings ADD CONSTRAINT bookings_booking_status_check 
CHECK (booking_status = ANY (ARRAY[
  'pending_approval'::text, 
  'approved'::text, 
  'ongoing'::text, 
  'completed'::text, 
  'cancel_pending'::text, 
  'cancelled'::text, 
  'payment_rejected'::text,
  'handed_over'::text,
  'extended'::text
]));

-- Update the extend_booking function to set status to 'extended'
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

  -- Check if booking can be extended
  IF booking_record.booking_status NOT IN ('approved', 'ongoing', 'handed_over', 'extended') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking cannot be extended in current status'
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
    'message', 'Booking extended successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Update the car status function to handle 'extended' status
CREATE OR REPLACE FUNCTION update_car_status_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking status changes, update car status accordingly
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If booking is approved, ongoing, or extended, mark car as rented
    IF NEW.booking_status IN ('approved', 'ongoing', 'extended') THEN
      UPDATE cars SET status = 'rented' WHERE id = NEW.car_id;
    -- If booking is completed or cancelled, mark car as available
    ELSIF NEW.booking_status IN ('completed', 'cancelled') THEN
      -- Only mark as available if no other active bookings exist
      UPDATE cars SET status = 'available' 
      WHERE id = NEW.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = NEW.car_id 
        AND booking_status IN ('approved', 'ongoing', 'extended')
        AND id != NEW.id
      );
    END IF;
  END IF;
  
  -- Handle deletion
  IF TG_OP = 'DELETE' THEN
    -- If an active booking is deleted, check if car should be available
    IF OLD.booking_status IN ('approved', 'ongoing', 'extended') THEN
      UPDATE cars SET status = 'available' 
      WHERE id = OLD.car_id 
      AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE car_id = OLD.car_id 
        AND booking_status IN ('approved', 'ongoing', 'extended')
      );
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update the overdue_bookings_view to include extended bookings
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
  AND b.booking_status IN ('approved', 'ongoing', 'extended')
  AND b.payment_status NOT IN ('cancelled', 'rejected')
  AND b.booking_status != 'cancelled';

-- Grant access to the updated view
GRANT SELECT ON overdue_bookings_view TO authenticated;