/*
  # Fix booking payment trigger ON CONFLICT error

  1. Problem
    - Database trigger is trying to use ON CONFLICT with booking_id
    - booking_id is not unique in payments table (multiple payments per booking allowed)
    - This causes "no unique or exclusion constraint matching" error

  2. Solution
    - Update trigger function to use proper conflict resolution
    - Use the primary key (id) for conflict resolution or remove ON CONFLICT entirely
    - Ensure payment creation logic works correctly for booking inserts
*/

-- First, let's check and fix the ensure_booking_payment_consistency function
CREATE OR REPLACE FUNCTION ensure_booking_payment_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create payment record if it doesn't exist for this booking
  -- Use a simple INSERT without ON CONFLICT since we want to allow multiple payments per booking
  IF NOT EXISTS (
    SELECT 1 FROM payments 
    WHERE booking_id = NEW.id 
    AND payment_method_code = 'PENDING'
  ) THEN
    INSERT INTO payments (
      booking_id,
      amount,
      payment_method_code,
      approved,
      admin_approval_status,
      payment_completion_status,
      car_name,
      car_plate_number,
      is_agent_booking,
      custom_price_requested,
      agent_notes,
      notes,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.total_amount,
      'PENDING',
      false,
      'pending',
      'pending',
      NEW.car_name,
      NEW.car_plate_number,
      COALESCE(NEW.is_agent_booking, false),
      NEW.custom_price_requested,
      NEW.agent_notes,
      'Auto-generated payment record for booking',
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also fix the ensure_payment_exists_for_booking function if it exists
CREATE OR REPLACE FUNCTION ensure_payment_exists_for_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create payment record if none exists for this booking
  IF NOT EXISTS (
    SELECT 1 FROM payments 
    WHERE booking_id = NEW.id
  ) THEN
    INSERT INTO payments (
      booking_id,
      amount,
      payment_method_code,
      approved,
      admin_approval_status,
      payment_completion_status,
      car_name,
      car_plate_number,
      is_agent_booking,
      custom_price_requested,
      agent_notes,
      notes,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.total_amount,
      'PENDING',
      false,
      'pending',
      'pending',
      NEW.car_name,
      NEW.car_plate_number,
      COALESCE(NEW.is_agent_booking, false),
      NEW.custom_price_requested,
      NEW.agent_notes,
      'Payment record created for approved booking',
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix any other potential trigger functions that might be using ON CONFLICT incorrectly
CREATE OR REPLACE FUNCTION sync_payment_after_booking_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update existing payment records for this booking instead of using ON CONFLICT
  UPDATE payments 
  SET 
    amount = NEW.total_amount,
    car_name = NEW.car_name,
    car_plate_number = NEW.car_plate_number,
    is_agent_booking = COALESCE(NEW.is_agent_booking, false),
    custom_price_requested = NEW.custom_price_requested,
    agent_notes = NEW.agent_notes,
    updated_at = now()
  WHERE booking_id = NEW.id;

  -- If no payment records were updated, create a new one
  IF NOT FOUND THEN
    INSERT INTO payments (
      booking_id,
      amount,
      payment_method_code,
      approved,
      admin_approval_status,
      payment_completion_status,
      car_name,
      car_plate_number,
      is_agent_booking,
      custom_price_requested,
      agent_notes,
      notes,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.total_amount,
      'PENDING',
      false,
      'pending',
      'pending',
      NEW.car_name,
      NEW.car_plate_number,
      COALESCE(NEW.is_agent_booking, false),
      NEW.custom_price_requested,
      NEW.agent_notes,
      'Payment record synced with booking changes',
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;