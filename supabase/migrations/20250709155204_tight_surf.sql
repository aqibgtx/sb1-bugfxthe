/*
  # Add 'cancelled' value to admin_approval_status enum

  1. Enum Updates
    - Add 'cancelled' as a valid value to the `admin_approval_status` enum type
    - This allows cancellation requests to be marked as 'cancelled' in addition to 'approved', 'pending', and 'rejected'

  2. Changes
    - Extends the existing enum without affecting current data
    - Enables the application to properly handle cancellation status updates
*/

-- Add 'cancelled' value to the admin_approval_status enum
ALTER TYPE public.admin_approval_status ADD VALUE 'cancelled';