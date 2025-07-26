/*
  # Add automatic booking cancellation system

  1. New Function
    - `auto_cancel_unpaid_bookings` - Automatically cancel bookings that haven't been paid within 3 days of approval

  2. Features
    - Cancel bookings where payment_status is still 'pending' after 3 days from booking_status = 'approved'
    - Only affects bookings that are approved but not paid
    - Updates both booking_status and payment_status to 'cancelled'
    - Adds explanatory note about auto-cancellation
*/

-- Function to automatically cancel unpaid bookings after 3 days
CREATE OR REPLACE FUNCTION auto_cancel_unpaid_bookings()
RETURNS void AS $$
BEGIN
  -- Cancel bookings that are approved but not paid within 3 days
  UPDATE bookings 
  SET 
    booking_status = 'cancelled',
    payment_status = 'cancelled',
    notes = COALESCE(notes, '') || ' | Auto-cancelled: Payment not received within 3 days of approval.',
    updated_at = now()
  WHERE 
    booking_status = 'approved' 
    AND payment_status = 'pending'
    AND created_at < now() - INTERVAL '3 days';
    
  -- Log the number of bookings cancelled
  RAISE NOTICE 'Auto-cancelled % unpaid bookings older than 3 days', 
    (SELECT count(*) FROM bookings 
     WHERE booking_status = 'cancelled' 
     AND notes LIKE '%Auto-cancelled: Payment not received within 3 days%'
     AND updated_at > now() - INTERVAL '1 minute');
END;
$$ language 'plpgsql';

-- Grant execute permission to authenticated users (for manual testing)
GRANT EXECUTE ON FUNCTION auto_cancel_unpaid_bookings() TO authenticated;

-- Note: In a production environment, you would typically set up a cron job or scheduled task
-- to run this function periodically (e.g., daily). For now, it can be called manually.
-- Example usage: SELECT auto_cancel_unpaid_bookings();