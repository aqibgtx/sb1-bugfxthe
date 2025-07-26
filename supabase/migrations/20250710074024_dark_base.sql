/*
  # Fix cancel_booking_direct function ambiguous column reference

  1. Problem
    - The cancel_booking_direct function has ambiguous column reference to "booking_id"
    - This occurs when the function parameter name conflicts with table column names

  2. Solution
    - Recreate the function with properly qualified column references
    - Use explicit table aliases to avoid ambiguity
    - Ensure all column references are unambiguous
*/

-- Drop the existing function to recreate it properly
DROP FUNCTION IF EXISTS public.cancel_booking_direct(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.cancel_booking_direct(uuid, text);

-- Create the corrected function with unambiguous column references
CREATE OR REPLACE FUNCTION public.cancel_booking_direct(
    p_booking_id uuid,
    p_staff_id uuid,
    p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_record bookings%ROWTYPE;
    result json;
BEGIN
    -- Get the booking record with explicit table reference
    SELECT b.* INTO booking_record
    FROM bookings b
    WHERE b.id = p_booking_id;

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

    -- Update booking status to cancelled with explicit table reference
    UPDATE bookings b
    SET 
        booking_status = 'cancelled',
        payment_status = 'cancelled',
        updated_at = now()
    WHERE b.id = p_booking_id;

    -- Update payment status to cancelled with explicit table reference
    UPDATE payments p
    SET 
        admin_approval_status = 'cancelled',
        payment_completion_status = 'cancelled',
        updated_at = now()
    WHERE p.booking_id = p_booking_id;

    -- Insert cancellation request record for audit trail with explicit table reference
    INSERT INTO cancellation_requests (
        booking_id,
        staff_id,
        reason,
        status,
        approved_by,
        approved_at
    ) VALUES (
        p_booking_id,
        p_staff_id,
        p_reason,
        'approved',
        p_staff_id,
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_booking_direct(uuid, uuid, text) TO authenticated;