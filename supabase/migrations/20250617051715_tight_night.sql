/*
  # Add 7-Eleven and Credit/Debit Card Payment Methods

  1. New Payment Methods
    - Add 7-Eleven payment option
    - Add Credit/Debit Card payment option
    - Ensure they are active by default

  2. Data Updates
    - Insert new payment methods if they don't exist
    - Maintain existing payment methods
*/

-- Insert new payment methods
INSERT INTO payment_methods (name, code) VALUES
  ('7-Eleven', '7ELEVEN'),
  ('Credit/Debit Card', 'CARD')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  active = true;

-- Ensure all payment methods are active
UPDATE payment_methods SET active = true WHERE code IN ('7ELEVEN', 'CARD', 'FPX', 'QR', 'ATOME');