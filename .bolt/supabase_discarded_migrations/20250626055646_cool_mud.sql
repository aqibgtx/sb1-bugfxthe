/*
  # Add Booking For and Delivery Method Fields

  1. Schema Changes
    - Add booking_for field to track who the booking is for
    - Add delivery_type field for delivery method selection
    - Add delivery_distance field for distance calculation
    - Add requires_deposit field for deposit tracking

  2. Data Migration
    - Set default values for existing bookings
    - Update constraints and indexes
*/

-- Add new columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_for text CHECK (booking_for IN ('myself', 'someone_else')) DEFAULT 'myself';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_type text CHECK (delivery_type IN ('self_pickup', 'free_pickup', 'vip_delivery')) DEFAULT 'self_pickup';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_distance integer DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requires_deposit boolean DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_booking_for ON bookings(booking_for);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_type ON bookings(delivery_type);

-- Add comments to document the new fields
COMMENT ON COLUMN bookings.booking_for IS 'Who the booking is for: myself or someone_else';
COMMENT ON COLUMN bookings.delivery_type IS 'Delivery method: self_pickup, free_pickup (7km), or vip_delivery (RM4/km)';
COMMENT ON COLUMN bookings.delivery_distance IS 'Distance for delivery in kilometers';
COMMENT ON COLUMN bookings.requires_deposit IS 'Whether this booking requires a security deposit';

-- Update existing bookings with default values
UPDATE bookings SET 
  booking_for = 'myself',
  delivery_type = 'self_pickup',
  delivery_distance = 0,
  requires_deposit = false
WHERE booking_for IS NULL OR delivery_type IS NULL;