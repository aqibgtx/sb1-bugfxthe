/*
  # Fix booking status constraint to include 'handed_over' status

  1. Problem
    - The booking_status CHECK constraint doesn't include 'handed_over' as a valid value
    - Existing booking records have 'handed_over' status causing constraint violations
    - This prevents the frontend from fetching booking data

  2. Solution
    - Drop the existing booking_status CHECK constraint
    - Add a new constraint that includes 'handed_over' as a valid status
    - This allows existing data to be queried without violations

  3. Valid booking statuses
    - pending_approval, approved, ongoing, completed, cancel_pending, cancelled, payment_rejected, handed_over
*/

-- Drop the existing booking_status constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;

-- Add the updated constraint that includes 'handed_over'
ALTER TABLE bookings ADD CONSTRAINT bookings_booking_status_check 
CHECK (booking_status = ANY (ARRAY[
  'pending_approval'::text, 
  'approved'::text, 
  'ongoing'::text, 
  'completed'::text, 
  'cancel_pending'::text, 
  'cancelled'::text, 
  'payment_rejected'::text,
  'handed_over'::text
]));