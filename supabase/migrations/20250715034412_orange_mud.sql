/*
  # Add Deposit Functionality to Booking System

  1. New Columns in Bookings Table
    - `deposit_amount` (numeric) - Amount of deposit collected
    - `deposit_collected_at` (timestamp) - When deposit was collected
    - `deposit_collected_by` (uuid) - Staff who collected deposit
    - `deposit_deducted` (numeric) - Amount deducted from deposit
    - `deposit_deduction_reason` (text) - Reason for deduction
    - `deposit_deducted_at` (timestamp) - When deduction was made
    - `deposit_deducted_by` (uuid) - Admin who approved deduction

  2. New Table: Deposit Deduction Requests
    - For staff to request deposit deductions from admin
    - Admin approval workflow for deposit deductions

  3. Security
    - Enable RLS on new table
    - Add policies for staff and admin access
*/

-- Add deposit columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_collected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deposit_collected_by uuid REFERENCES users(id),
ADD COLUMN IF NOT EXISTS deposit_deducted numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_deduction_reason text,
ADD COLUMN IF NOT EXISTS deposit_deducted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deposit_deducted_by uuid REFERENCES users(id);

-- Create deposit deduction requests table
CREATE TABLE IF NOT EXISTS deposit_deduction_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id),
  requested_amount numeric(10,2) NOT NULL CHECK (requested_amount > 0),
  reason text NOT NULL,
  damage_description text,
  evidence_photos text[], -- Array of photo URLs
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  admin_notes text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on deposit deduction requests
ALTER TABLE deposit_deduction_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for deposit deduction requests
CREATE POLICY "Staff can create deduction requests"
  ON deposit_deduction_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'staff' 
      AND users.approved = true
    )
  );

CREATE POLICY "Staff can view own deduction requests"
  ON deposit_deduction_requests
  FOR SELECT
  TO authenticated
  USING (
    requested_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all deduction requests"
  ON deposit_deduction_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin' 
      AND users.approved = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_amount ON bookings(deposit_amount) WHERE deposit_amount > 0;
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_collected ON bookings(deposit_collected_at) WHERE deposit_collected_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_deducted ON bookings(deposit_deducted) WHERE deposit_deducted > 0;

CREATE INDEX IF NOT EXISTS idx_deposit_deduction_requests_booking_id ON deposit_deduction_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_deposit_deduction_requests_status ON deposit_deduction_requests(status);
CREATE INDEX IF NOT EXISTS idx_deposit_deduction_requests_requested_by ON deposit_deduction_requests(requested_by);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_deposit_deduction_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deposit_deduction_requests_updated_at
  BEFORE UPDATE ON deposit_deduction_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_deposit_deduction_requests_updated_at();

-- Create function to handle deposit deduction approval
CREATE OR REPLACE FUNCTION approve_deposit_deduction(
  request_id uuid,
  admin_id uuid,
  admin_notes_param text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  request_record deposit_deduction_requests%ROWTYPE;
BEGIN
  -- Get the request details
  SELECT * INTO request_record
  FROM deposit_deduction_requests
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deduction request not found or already processed';
  END IF;
  
  -- Update the request status
  UPDATE deposit_deduction_requests
  SET 
    status = 'approved',
    approved_by = admin_id,
    approved_at = now(),
    admin_notes = admin_notes_param,
    updated_at = now()
  WHERE id = request_id;
  
  -- Update the booking with deduction details
  UPDATE bookings
  SET 
    deposit_deducted = COALESCE(deposit_deducted, 0) + request_record.requested_amount,
    deposit_deduction_reason = CASE 
      WHEN deposit_deduction_reason IS NULL THEN request_record.reason
      ELSE deposit_deduction_reason || '; ' || request_record.reason
    END,
    deposit_deducted_at = now(),
    deposit_deducted_by = admin_id,
    updated_at = now()
  WHERE id = request_record.booking_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to reject deposit deduction
CREATE OR REPLACE FUNCTION reject_deposit_deduction(
  request_id uuid,
  admin_id uuid,
  admin_notes_param text
)
RETURNS void AS $$
BEGIN
  UPDATE deposit_deduction_requests
  SET 
    status = 'rejected',
    approved_by = admin_id,
    approved_at = now(),
    admin_notes = admin_notes_param,
    updated_at = now()
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deduction request not found or already processed';
  END IF;
END;
$$ LANGUAGE plpgsql;