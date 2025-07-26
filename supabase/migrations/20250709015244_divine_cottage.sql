/*
  # Add Client Approval Request System

  1. Schema Changes
    - Add client_pickup_requested and client_dropoff_requested columns to bookings table
    - Add client_pickup_request_time and client_dropoff_request_time for tracking
    - Add client_pickup_photo_url and client_dropoff_photo_url for client submissions
    - Add indexes for better performance

  2. Features
    - Track client pickup/dropoff requests separately from staff confirmations
    - Store client-submitted photos for approval workflow
    - Maintain existing staff handover/return functionality
*/

-- Add client request columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_pickup_requested boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_dropoff_requested boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_pickup_request_time timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_dropoff_request_time timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_pickup_photo_url text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_dropoff_photo_url text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_client_pickup_requested ON bookings(client_pickup_requested) WHERE client_pickup_requested = true;
CREATE INDEX IF NOT EXISTS idx_bookings_client_dropoff_requested ON bookings(client_dropoff_requested) WHERE client_dropoff_requested = true;

-- Add comments to document the fields
COMMENT ON COLUMN bookings.client_pickup_requested IS 'Whether client has requested pickup confirmation (pending staff approval)';
COMMENT ON COLUMN bookings.client_dropoff_requested IS 'Whether client has requested dropoff confirmation (pending staff approval)';
COMMENT ON COLUMN bookings.client_pickup_request_time IS 'When client submitted pickup request';
COMMENT ON COLUMN bookings.client_dropoff_request_time IS 'When client submitted dropoff request';
COMMENT ON COLUMN bookings.client_pickup_photo_url IS 'Photo URL submitted by client for pickup request';
COMMENT ON COLUMN bookings.client_dropoff_photo_url IS 'Photo URL submitted by client for dropoff request';