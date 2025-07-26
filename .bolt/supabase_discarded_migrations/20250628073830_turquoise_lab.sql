/*
  # Remove handover logs triggers to fix constraint violation

  1. Changes
    - Drop triggers that insert into handover_logs table
    - Keep only bookings table for recording handover/return data
    - Remove dependency on handover_logs table for car handover/return functionality

  2. Security
    - No RLS changes needed as we're only removing triggers
    - Bookings table already has proper RLS policies
*/

-- Drop the triggers that insert into handover_logs table
DROP TRIGGER IF EXISTS process_car_handover_trigger ON bookings;
DROP TRIGGER IF EXISTS process_car_return_trigger ON bookings;

-- Drop the trigger functions if they exist
DROP FUNCTION IF EXISTS process_car_handover();
DROP FUNCTION IF EXISTS process_car_return();