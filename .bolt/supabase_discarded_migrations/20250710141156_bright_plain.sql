/*
  # Add payment and invoice links to booking_extensions table

  1. Schema Changes
    - Add stripe_payment_url column to booking_extensions table
    - Add invoice_url column to booking_extensions table
    - Add indexes for better performance

  2. Features
    - Store Stripe payment links for extensions
    - Store invoice links for extensions
    - Track payment and invoice information per extension
*/

-- Add payment and invoice URL columns to booking_extensions table
ALTER TABLE booking_extensions ADD COLUMN IF NOT EXISTS stripe_payment_url text;
ALTER TABLE booking_extensions ADD COLUMN IF NOT EXISTS invoice_url text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_extensions_stripe_payment_url ON booking_extensions(stripe_payment_url) WHERE stripe_payment_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_extensions_invoice_url ON booking_extensions(invoice_url) WHERE invoice_url IS NOT NULL;

-- Add comments to document the fields
COMMENT ON COLUMN booking_extensions.stripe_payment_url IS 'Stripe payment link for the extension payment';
COMMENT ON COLUMN booking_extensions.invoice_url IS 'Invoice URL for the extension';