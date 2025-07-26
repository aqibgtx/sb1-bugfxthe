/*
  # Fix Duplicate Delivery Columns and Centralize Delivery Information

  1. Schema Cleanup
    - Remove duplicate delivery columns from bookings table
    - Keep only the correct delivery columns in bookings table
    - Update delivery_details table to reference bookings data
    - Remove redundant columns

  2. Data Migration
    - Migrate existing delivery data to the correct columns
    - Ensure data consistency across tables
    - Update any references to old column names

  3. Centralization
    - All delivery information stored in bookings table
    - delivery_details table simplified to store only address info
    - Remove duplicate tracking fields
*/

-- First, let's check what delivery columns exist and clean them up
-- Remove old delivery columns that might be duplicates
DO $$
BEGIN
  -- Remove delivery_enabled if it exists (we'll use delivery_type instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'delivery_enabled'
  ) THEN
    ALTER TABLE bookings DROP COLUMN delivery_enabled;
  END IF;

  -- Remove delivery_km_travelled if it exists (we'll use delivery_distance instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'delivery_km_travelled'
  ) THEN
    ALTER TABLE bookings DROP COLUMN delivery_km_travelled;
  END IF;

  -- Remove delivery_toll_fee if it exists (we'll calculate this in delivery_fee)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'delivery_toll_fee'
  ) THEN
    ALTER TABLE bookings DROP COLUMN delivery_toll_fee;
  END IF;

  -- Remove delivery_petrol_fee if it exists (we'll calculate this in delivery_fee)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'delivery_petrol_fee'
  ) THEN
    ALTER TABLE bookings DROP COLUMN delivery_petrol_fee;
  END IF;
END $$;

-- Ensure we have the correct delivery columns in bookings table
DO $$
BEGIN
  -- Add booking_for if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'booking_for'
  ) THEN
    ALTER TABLE bookings ADD COLUMN booking_for text CHECK (booking_for IN ('myself', 'someone_else')) DEFAULT 'myself';
  END IF;

  -- Add delivery_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'delivery_type'
  ) THEN
    ALTER TABLE bookings ADD COLUMN delivery_type text CHECK (delivery_type IN ('self_pickup', 'free_pickup', 'vip_delivery')) DEFAULT 'self_pickup';
  END IF;

  -- Add delivery_distance if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'delivery_distance'
  ) THEN
    ALTER TABLE bookings ADD COLUMN delivery_distance integer DEFAULT 0;
  END IF;

  -- Add requires_deposit if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'requires_deposit'
  ) THEN
    ALTER TABLE bookings ADD COLUMN requires_deposit boolean DEFAULT false;
  END IF;
END $$;

-- Update existing bookings to have proper delivery information
UPDATE bookings SET 
  booking_for = COALESCE(booking_for, 'myself'),
  delivery_type = COALESCE(delivery_type, 'self_pickup'),
  delivery_distance = COALESCE(delivery_distance, 0),
  requires_deposit = COALESCE(requires_deposit, false)
WHERE booking_for IS NULL OR delivery_type IS NULL OR delivery_distance IS NULL OR requires_deposit IS NULL;

-- Update delivery_fee calculation based on delivery_type and delivery_distance
UPDATE bookings SET 
  delivery_fee = CASE 
    WHEN delivery_type = 'self_pickup' THEN 0
    WHEN delivery_type = 'free_pickup' THEN 
      CASE 
        WHEN delivery_distance > 7 THEN (delivery_distance - 7) * 2 
        ELSE 0 
      END
    WHEN delivery_type = 'vip_delivery' THEN delivery_distance * 4
    ELSE 0
  END
WHERE delivery_type IS NOT NULL AND delivery_distance IS NOT NULL;

-- Simplify delivery_details table to only store address information
-- Remove redundant columns from delivery_details if they exist
DO $$
BEGIN
  -- Remove delivery_date if it exists (use booking dates instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_details' AND column_name = 'delivery_date'
  ) THEN
    ALTER TABLE delivery_details DROP COLUMN delivery_date;
  END IF;

  -- Remove pickup_date if it exists (use booking dates instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_details' AND column_name = 'pickup_date'
  ) THEN
    ALTER TABLE delivery_details DROP COLUMN pickup_date;
  END IF;

  -- Remove delivery_status if it exists (use booking_status instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_details' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE delivery_details DROP COLUMN delivery_status;
  END IF;
END $$;

-- Update delivery_details to only contain essential address information
-- Clean up existing delivery_details records
UPDATE delivery_details SET 
  delivery_address = COALESCE(delivery_address, 'Address not specified'),
  pickup_address = COALESCE(pickup_address, delivery_address)
WHERE delivery_address IS NULL OR pickup_address IS NULL;

-- Create indexes for better performance on new delivery columns
CREATE INDEX IF NOT EXISTS idx_bookings_booking_for ON bookings(booking_for);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_type ON bookings(delivery_type);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_distance ON bookings(delivery_distance);
CREATE INDEX IF NOT EXISTS idx_bookings_requires_deposit ON bookings(requires_deposit);

-- Add comments to document the centralized delivery system
COMMENT ON COLUMN bookings.booking_for IS 'Who the booking is for: myself or someone_else';
COMMENT ON COLUMN bookings.delivery_type IS 'Delivery method: self_pickup, free_pickup (7km), or vip_delivery (RM4/km)';
COMMENT ON COLUMN bookings.delivery_distance IS 'Distance for delivery in kilometers';
COMMENT ON COLUMN bookings.delivery_fee IS 'Calculated delivery fee based on delivery_type and delivery_distance';
COMMENT ON COLUMN bookings.requires_deposit IS 'Whether this booking requires a security deposit';

-- Update delivery_details table comment
COMMENT ON TABLE delivery_details IS 'Stores only delivery address information - all other delivery data is in bookings table';
COMMENT ON COLUMN delivery_details.delivery_address IS 'Primary delivery address for the booking';
COMMENT ON COLUMN delivery_details.pickup_address IS 'Pickup address if different from delivery address';

-- Function to calculate delivery fee automatically
CREATE OR REPLACE FUNCTION calculate_delivery_fee(
  p_delivery_type text,
  p_delivery_distance integer
) RETURNS decimal AS $$
BEGIN
  CASE p_delivery_type
    WHEN 'self_pickup' THEN
      RETURN 0;
    WHEN 'free_pickup' THEN
      RETURN CASE 
        WHEN p_delivery_distance > 7 THEN (p_delivery_distance - 7) * 2 
        ELSE 0 
      END;
    WHEN 'vip_delivery' THEN
      RETURN p_delivery_distance * 4;
    ELSE
      RETURN 0;
  END CASE;
END;
$$ language 'plpgsql';

-- Function to automatically update delivery fee when delivery info changes
CREATE OR REPLACE FUNCTION update_delivery_fee()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate delivery fee based on delivery type and distance
  NEW.delivery_fee = calculate_delivery_fee(NEW.delivery_type, NEW.delivery_distance);
  
  -- Update requires_deposit based on booking conditions
  NEW.requires_deposit = (NEW.booking_for = 'someone_else' OR NEW.delivery_type = 'vip_delivery');
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update delivery fee
DROP TRIGGER IF EXISTS update_delivery_fee_trigger ON bookings;
CREATE TRIGGER update_delivery_fee_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW 
  WHEN (NEW.delivery_type IS NOT NULL AND NEW.delivery_distance IS NOT NULL)
  EXECUTE FUNCTION update_delivery_fee();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_delivery_fee(text, integer) TO authenticated;

-- Update total_amount for existing bookings to ensure consistency
UPDATE bookings SET 
  total_amount = rental_amount + COALESCE(add_ons_amount, 0) + COALESCE(delivery_fee, 0)
WHERE total_amount != (rental_amount + COALESCE(add_ons_amount, 0) + COALESCE(delivery_fee, 0));

-- Final data consistency check and cleanup
-- Remove any orphaned delivery_details records
DELETE FROM delivery_details 
WHERE booking_id NOT IN (SELECT id FROM bookings);

-- Ensure all bookings with delivery_type != 'self_pickup' have delivery_details
INSERT INTO delivery_details (booking_id, delivery_address, pickup_address)
SELECT 
  b.id,
  COALESCE(
    CASE 
      WHEN b.delivery_type = 'free_pickup' THEN 'Free pickup within 7km radius'
      WHEN b.delivery_type = 'vip_delivery' THEN 'VIP delivery service'
      ELSE 'Delivery address not specified'
    END,
    'Address not specified'
  ),
  'Same as delivery address'
FROM bookings b
WHERE b.delivery_type != 'self_pickup'
AND NOT EXISTS (
  SELECT 1 FROM delivery_details dd WHERE dd.booking_id = b.id
)
ON CONFLICT DO NOTHING;