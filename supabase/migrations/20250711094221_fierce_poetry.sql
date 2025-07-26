/*
  # Remove unique constraint on payments.booking_id

  This migration removes the unique constraint on the booking_id column in the payments table
  to allow multiple payment records per booking (for scenarios like payment retries, extensions, etc.).

  ## Changes
  1. Drop the unique constraint `payments_booking_id_key` on the booking_id column
  2. Keep the primary key constraint on payments.id (unchanged)
  3. Keep the foreign key relationship to bookings table (unchanged)

  ## Impact
  - Allows multiple payment records for the same booking
  - Resolves the 409 Conflict error when creating additional payments
  - Maintains data integrity through existing foreign key constraints
*/

-- Remove the unique constraint on booking_id to allow multiple payments per booking
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_booking_id_key;