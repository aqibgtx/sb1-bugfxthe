/*
  # Enhance Deposit Workflow and Return Process

  1. Schema Updates
    - Add deposit_status column with 'pending' and 'returned' values
    - Add deposit_returned_at and deposit_returned_by columns
    - Add deposit_return_proof_urls and car_return_proof_urls arrays for multiple photos
    - Update existing deposit columns to support the enhanced workflow

  2. Security
    - Maintain existing RLS policies
    - Add indexes for new columns

  3. Changes
    - Enhanced deposit tracking with return status
    - Support for multiple proof photos (up to 10 pictures, minimum 1 required)
    - Proper workflow for deposit deduction request approval before return submission
*/

-- Add new deposit-related columns if they don't exist
DO $$
BEGIN
  -- Add deposit_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'deposit_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN deposit_status text DEFAULT 'pending'::text;
    ALTER TABLE bookings ADD CONSTRAINT bookings_deposit_status_check 
      CHECK (deposit_status = ANY (ARRAY['pending'::text, 'returned'::text]));
  END IF;

  -- Add deposit_returned_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'deposit_returned_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN deposit_returned_at timestamp with time zone;
  END IF;

  -- Add deposit_returned_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'deposit_returned_by'
  ) THEN
    ALTER TABLE bookings ADD COLUMN deposit_returned_by uuid;
    ALTER TABLE bookings ADD CONSTRAINT bookings_deposit_returned_by_fkey 
      FOREIGN KEY (deposit_returned_by) REFERENCES users(id);
  END IF;

  -- Add deposit_return_proof_urls column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'deposit_return_proof_urls'
  ) THEN
    ALTER TABLE bookings ADD COLUMN deposit_return_proof_urls text[];
  END IF;

  -- Add car_return_proof_urls column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'car_return_proof_urls'
  ) THEN
    ALTER TABLE bookings ADD COLUMN car_return_proof_urls text[];
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_status ON bookings USING btree (deposit_status);
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_returned_at ON bookings USING btree (deposit_returned_at) WHERE (deposit_returned_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_returned_by ON bookings USING btree (deposit_returned_by) WHERE (deposit_returned_by IS NOT NULL);