/*
  # Remove 7-Eleven Payment Method

  1. Data Updates
    - Remove 7-Eleven payment method from payment_methods table
    - Update any existing payments that used 7-Eleven to use a different method
    - Clean up any references to 7ELEVEN payment method code

  2. Cleanup
    - Ensure data consistency after removal
    - Update payment method codes where necessary
*/

-- Update any existing payments that used 7-Eleven to use CASH instead
UPDATE payments 
SET payment_method_code = 'CASH'
WHERE payment_method_code = '7ELEVEN';

-- Remove 7-Eleven payment method from payment_methods table
DELETE FROM payment_methods WHERE code = '7ELEVEN';

-- Ensure remaining payment methods are active
UPDATE payment_methods SET active = true WHERE code IN ('FPX', 'CARD', 'QR', 'ATOME');