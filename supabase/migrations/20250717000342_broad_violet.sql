/*
  # Add 'refunded' status to admin_approval_status enum

  1. Changes
    - Add 'refunded' value to the admin_approval_status enum type
    - This enables proper refund flow tracking for approved payments

  2. Purpose
    - Allows payments with admin_approval_status = 'approved' to be refunded
    - Sets admin_approval_status to 'refunded' when refund is processed
    - Maintains clear audit trail of payment status changes
*/

-- Add 'refunded' to the admin_approval_status enum
ALTER TYPE admin_approval_status ADD VALUE 'refunded';