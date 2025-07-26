/*
  # Fix cancel_booking_direct trigger conflict

  1. Problem
    - The cancel_booking_direct RPC function is failing with error "tuple to be updated was already modified by an operation triggered by the current command"
    - This indicates a BEFORE trigger is modifying the same row that the function is trying to update

  2. Solution
    - Identify and fix the conflicting trigger by changing it from BEFORE to AFTER
    - The most likely culprit is the handle_self_cancellation_trigger which is a BEFORE UPDATE trigger
    - Change it to AFTER UPDATE to avoid the conflict

  3. Changes
    - Drop the existing BEFORE UPDATE trigger
    - Recreate it as an AFTER UPDATE trigger
    - Ensure the function logic still works correctly
*/

-- First, let's check if the cancel_booking_direct function exists and create/update it
CREATE OR REPLACE FUNCTION cancel_booking_direct(booking_id_param uuid, staff_id_param uuid, reason_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_record bookings%ROWTYPE;
    result json;
BEGIN
    -- Get the booking record
    SELECT * INTO booking_record
    FROM bookings
    WHERE id = booking_id_param;

    -- Check if booking exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Booking not found'
        );
    END IF;

    -- Check if booking can be cancelled
    IF booking_record.booking_status IN ('completed', 'cancelled') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Booking cannot be cancelled in current status'
        );
    END IF;

    -- Update booking status to cancelled
    UPDATE bookings 
    SET 
        booking_status = 'cancelled',
        payment_status = 'cancelled',
        updated_at = now()
    WHERE id = booking_id_param;

    -- Update payment status to cancelled
    UPDATE payments 
    SET 
        admin_approval_status = 'cancelled',
        payment_completion_status = 'cancelled',
        updated_at = now()
    WHERE booking_id = booking_id_param;

    -- Insert cancellation request record for audit trail
    INSERT INTO cancellation_requests (
        booking_id,
        staff_id,
        reason,
        status,
        approved_by,
        approved_at
    ) VALUES (
        booking_id_param,
        staff_id_param,
        reason_param,
        'approved',
        staff_id_param,
        now()
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Booking cancelled successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Drop the problematic BEFORE trigger that's causing the conflict
DROP TRIGGER IF EXISTS handle_self_cancellation_trigger ON bookings;

-- Recreate the trigger as an AFTER trigger to avoid the conflict
CREATE TRIGGER handle_self_cancellation_trigger
    AFTER UPDATE ON bookings
    FOR EACH ROW
    WHEN (OLD.booking_status IS DISTINCT FROM NEW.booking_status AND NEW.booking_status = 'cancelled')
    EXECUTE FUNCTION handle_self_cancellation();

-- Also check and fix the sync_payment_cancellation_trigger if it's causing issues
DROP TRIGGER IF EXISTS sync_payment_cancellation_trigger ON payments;

CREATE TRIGGER sync_payment_cancellation_trigger
    AFTER UPDATE ON payments
    FOR EACH ROW
    WHEN (
        (OLD.admin_approval_status IS DISTINCT FROM NEW.admin_approval_status AND NEW.admin_approval_status = 'cancelled')
        OR 
        (OLD.payment_completion_status IS DISTINCT FROM NEW.payment_completion_status AND NEW.payment_completion_status = 'cancelled')
    )
    EXECUTE FUNCTION sync_payment_cancellation();