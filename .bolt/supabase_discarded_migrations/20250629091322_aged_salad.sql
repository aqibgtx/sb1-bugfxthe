/*
  # Add delivery_enabled column to bookings table

  1. Changes
    - Add `delivery_enabled` column to `bookings` table
    - Set default value to `false`
    - Add index for performance
    - Update existing records based on delivery_type

  2. Security
    - No changes to RLS policies needed
*/

-- Add the delivery_enabled column
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT false;

-- Update existing records to set delivery_enabled based on delivery_type
UPDATE bookings 
SET delivery_enabled = (delivery_type != 'self_pickup' AND delivery_type IS NOT NULL)
WHERE delivery_enabled IS NULL OR delivery_enabled = false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_enabled 
ON bookings (delivery_enabled);

-- Add comment to document the column
COMMENT ON COLUMN bookings.delivery_enabled IS 'Indicates whether delivery service is enabled for this booking';