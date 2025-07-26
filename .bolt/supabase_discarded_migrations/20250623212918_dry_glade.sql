/*
  # Add Car Information to Bookings and Payments Tables

  1. Schema Changes
    - Add car_name and car_plate_number columns to bookings table
    - Add car_name and car_plate_number columns to payments table
    - Update existing records with car information

  2. Triggers
    - Create trigger to automatically populate car info when booking is created
    - Create trigger to automatically populate car info when payment is created

  3. Data Migration
    - Populate existing records with car information from related car records
*/

-- Add car information columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS car_name text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS car_plate_number text;

-- Add car information columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS car_name text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS car_plate_number text;

-- Function to get car information
CREATE OR REPLACE FUNCTION get_car_info(car_uuid uuid)
RETURNS TABLE(car_name text, car_plate_number text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CONCAT(c.brand, ' ', c.make, CASE WHEN c.spec IS NOT NULL THEN CONCAT(' ', c.spec) ELSE '' END) as car_name,
    c.plate_number as car_plate_number
  FROM cars c
  WHERE c.id = car_uuid;
END;
$$ language 'plpgsql';

-- Function to automatically populate car info in bookings
CREATE OR REPLACE FUNCTION populate_booking_car_info()
RETURNS TRIGGER AS $$
DECLARE
  car_info RECORD;
BEGIN
  -- Get car information
  SELECT * INTO car_info FROM get_car_info(NEW.car_id);
  
  -- Populate car info fields
  NEW.car_name = car_info.car_name;
  NEW.car_plate_number = car_info.car_plate_number;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to automatically populate car info in payments
CREATE OR REPLACE FUNCTION populate_payment_car_info()
RETURNS TRIGGER AS $$
DECLARE
  car_info RECORD;
  booking_car_id uuid;
BEGIN
  -- Get car_id from the related booking
  SELECT car_id INTO booking_car_id
  FROM bookings
  WHERE id = NEW.booking_id;
  
  -- Get car information
  SELECT * INTO car_info FROM get_car_info(booking_car_id);
  
  -- Populate car info fields
  NEW.car_name = car_info.car_name;
  NEW.car_plate_number = car_info.car_plate_number;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic car info population
DROP TRIGGER IF EXISTS populate_booking_car_info_trigger ON bookings;
CREATE TRIGGER populate_booking_car_info_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION populate_booking_car_info();

DROP TRIGGER IF EXISTS populate_payment_car_info_trigger ON payments;
CREATE TRIGGER populate_payment_car_info_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION populate_payment_car_info();

-- Migrate existing bookings data
UPDATE bookings 
SET 
  car_name = CONCAT(c.brand, ' ', c.make, CASE WHEN c.spec IS NOT NULL THEN CONCAT(' ', c.spec) ELSE '' END),
  car_plate_number = c.plate_number
FROM cars c
WHERE bookings.car_id = c.id
AND (bookings.car_name IS NULL OR bookings.car_plate_number IS NULL);

-- Migrate existing payments data
UPDATE payments 
SET 
  car_name = CONCAT(c.brand, ' ', c.make, CASE WHEN c.spec IS NOT NULL THEN CONCAT(' ', c.spec) ELSE '' END),
  car_plate_number = c.plate_number
FROM bookings b
JOIN cars c ON b.car_id = c.id
WHERE payments.booking_id = b.id
AND (payments.car_name IS NULL OR payments.car_plate_number IS NULL);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_car_name ON bookings(car_name);
CREATE INDEX IF NOT EXISTS idx_bookings_car_plate_number ON bookings(car_plate_number);
CREATE INDEX IF NOT EXISTS idx_payments_car_name ON payments(car_name);
CREATE INDEX IF NOT EXISTS idx_payments_car_plate_number ON payments(car_plate_number);

-- Add comments to document the new fields
COMMENT ON COLUMN bookings.car_name IS 'Car brand, make and spec (e.g., Toyota Camry 2.5L Hybrid)';
COMMENT ON COLUMN bookings.car_plate_number IS 'Car registration plate number (e.g., WA1234A)';
COMMENT ON COLUMN payments.car_name IS 'Car brand, make and spec (e.g., Toyota Camry 2.5L Hybrid)';
COMMENT ON COLUMN payments.car_plate_number IS 'Car registration plate number (e.g., WA1234A)';