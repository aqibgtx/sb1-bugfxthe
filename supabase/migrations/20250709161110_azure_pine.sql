/*
  # Create cancel_booking_direct function

  1. New Function
    - `cancel_booking_direct` - Safely cancel a booking and related payment
    - Handles both booking_status and payment_status updates
    - Avoids trigger conflicts by using a single transaction

  2. Security
    - Function runs with SECURITY DEFINER to ensure proper permissions
    - Updates are atomic to maintain data consistency
*/

CREATE OR REPLACE FUNCTION public.cancel_booking_direct(
    booking_id uuid,
    cancellation_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update booking status to cancelled
    UPDATE public.bookings
    SET
        booking_status = 'cancelled',
        payment_status = 'cancelled',
        notes = COALESCE(notes, '') || ' | ' || cancellation_note,
        updated_at = now()
    WHERE
        id = booking_id;
    
    -- Update related payment record to cancelled status
    UPDATE public.payments
    SET
        payment_completion_status = 'cancelled',
        admin_approval_status = 'cancelled',
        notes = COALESCE(notes, '') || ' | Payment cancelled due to booking cancellation.',
        updated_at = now()
    WHERE
        booking_id = cancel_booking_direct.booking_id;
        
    -- If no rows were affected, the booking doesn't exist
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking with ID % not found', booking_id;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_booking_direct(uuid, text) TO authenticated;