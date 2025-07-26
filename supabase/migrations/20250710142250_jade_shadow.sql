/*
  # Booking Extension System Improvements

  1. Schema Updates
    - Add stripe_payment_url column to booking_extensions table
    - Add invoice_url column to booking_extensions table
    - Update booking extension system to store payment and invoice links

  2. Features
    - Store Stripe payment links for extensions
    - Store invoice links for extensions
    - Group extension payments with main booking payments in approvals
*/

-- Add new columns to booking_extensions table
ALTER TABLE booking_extensions ADD COLUMN IF NOT EXISTS stripe_payment_url text;
ALTER TABLE booking_extensions ADD COLUMN IF NOT EXISTS invoice_url text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_extensions_stripe_payment_url ON booking_extensions(stripe_payment_url) WHERE stripe_payment_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_extensions_invoice_url ON booking_extensions(invoice_url) WHERE invoice_url IS NOT NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN booking_extensions.stripe_payment_url IS 'Stripe payment URL for extension payment';
COMMENT ON COLUMN booking_extensions.invoice_url IS 'Invoice URL for extension payment';

-- Update the extend_booking function to handle admin extensions without approval
CREATE OR REPLACE FUNCTION extend_booking(
  p_booking_id uuid,
  p_extension_days integer,
  p_daily_rate decimal(10,2),
  p_created_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record bookings%ROWTYPE;
  extension_amount decimal(10,2);
  new_end_date date;
  extension_id uuid;
  user_role text;
  result json;
BEGIN
  -- Get the booking record
  SELECT * INTO booking_record
  FROM bookings
  WHERE id = p_booking_id;

  -- Check if booking exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Check if booking can be extended
  IF booking_record.booking_status NOT IN ('approved', 'ongoing', 'handed_over', 'extended') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking cannot be extended in current status: ' || booking_record.booking_status
    );
  END IF;

  -- Get user role
  SELECT role INTO user_role
  FROM users
  WHERE id = p_created_by;

  -- Calculate extension details
  extension_amount := p_extension_days * p_daily_rate;
  new_end_date := booking_record.end_date + (p_extension_days || ' days')::interval;

  -- Create extension record
  INSERT INTO booking_extensions (
    booking_id,
    original_end_date,
    extended_end_date,
    extension_days,
    daily_rate,
    extension_amount,
    payment_due_date,
    created_by,
    payment_status
  ) VALUES (
    p_booking_id,
    booking_record.end_date,
    new_end_date,
    p_extension_days,
    p_daily_rate,
    extension_amount,
    new_end_date,
    p_created_by,
    CASE 
      WHEN user_role = 'admin' THEN 'paid'  -- Admin extensions are auto-approved
      ELSE 'pending'
    END
  ) RETURNING id INTO extension_id;

  -- Update booking end_date and status to 'extended'
  UPDATE bookings 
  SET 
    end_date = new_end_date,
    total_days = total_days + p_extension_days,
    booking_status = 'extended',
    updated_at = now()
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'extension_id', extension_id,
    'new_end_date', new_end_date,
    'extension_amount', extension_amount,
    'original_status', booking_record.booking_status,
    'new_status', 'extended',
    'auto_approved', user_role = 'admin',
    'message', CASE 
      WHEN user_role = 'admin' THEN 'Booking extended successfully by admin - no approval required'
      ELSE 'Booking extended successfully and status updated to Extended'
    END
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
GRANT EXECUTE ON FUNCTION extend_booking(uuid, integer, decimal, uuid) TO authenticated;