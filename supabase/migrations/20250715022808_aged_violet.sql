/*
  # Make staff_id nullable in bookings table

  1. Changes
    - Modify `staff_id` column in `bookings` table to allow NULL values
    - This enables client self-bookings where no staff assistance is required

  2. Security
    - No RLS changes needed as existing policies remain valid
    - NULL staff_id will be handled by existing application logic

  3. Notes
    - Client bookings will have staff_id = NULL
    - Staff-assisted bookings will continue to have staff_id populated
    - Existing foreign key constraint remains intact for non-null values
*/

-- Make staff_id column nullable to support client self-bookings
ALTER TABLE public.bookings ALTER COLUMN staff_id DROP NOT NULL;