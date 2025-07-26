/*
  # Add 'cancelled' value to payment_completion_status enum

  1. Enum Updates
    - Add 'cancelled' as a valid value to the `payment_completion_status` enum
    - This allows payments to be marked as cancelled when cancellation requests are approved
    - Aligns database schema with application logic that uses 'cancelled' status

  2. Background
    - The application code in Approvals.tsx and Stripe webhook handler already uses 'cancelled'
    - Database enum was missing this value, causing constraint violations
    - This migration resolves the mismatch between code and schema
*/

-- Add 'cancelled' as a valid value to the payment_completion_status enum
ALTER TYPE payment_completion_status ADD VALUE 'cancelled';