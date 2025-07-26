/*
  # Add late fee invoice link to bookings table

  1. Schema Changes
    - Add late_fee_invoice_url column to bookings table
    - Add late_fee_invoice_number column to bookings table
    - Add indexes for better performance

  2. Features
    - Store late fee invoice links directly in bookings
    - Track late fee invoice numbers for reference
*/

-- Add late fee invoice columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS late_fee_invoice_url text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS late_fee_invoice_number text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_late_fee_invoice ON bookings(late_fee_invoice_number) WHERE late_fee_invoice_number IS NOT NULL;

-- Add comment to document the fields
COMMENT ON COLUMN bookings.late_fee_invoice_url IS 'URL link to the late fee invoice if applicable';
COMMENT ON COLUMN bookings.late_fee_invoice_number IS 'Invoice number for late fee charges';