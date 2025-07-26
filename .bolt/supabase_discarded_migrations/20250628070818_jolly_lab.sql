/*
  # Add returned_by column to bookings table

  1. Changes
    - Add `returned_by` column to `bookings` table to track who performed the car return
    - This will allow the database trigger to properly populate the `performed_by` field in `handover_logs`

  2. Security
    - No changes to RLS policies needed as this is just adding a tracking field
*/

-- Add returned_by column to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'returned_by'
  ) THEN
    ALTER TABLE bookings ADD COLUMN returned_by uuid REFERENCES users(id);
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_returned_by ON bookings(returned_by);