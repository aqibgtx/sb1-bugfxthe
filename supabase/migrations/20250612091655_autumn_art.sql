/*
  # Add Cancellation Request System

  1. New Table
    - `cancellation_requests` - Track cancellation requests for paid bookings
    - Requires admin approval before cancellation is processed

  2. Security
    - Enable RLS on cancellation_requests table
    - Add policies for staff to create and admin to manage

  3. Workflow
    - Staff can request cancellation for paid bookings
    - Admin must approve before booking is actually cancelled
    - Automatic cleanup of approved/rejected requests
*/

-- Cancellation Requests Table
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  staff_id uuid REFERENCES users(id) NOT NULL,
  reason text NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cancellation_requests
CREATE POLICY "Staff can create cancellation requests" ON cancellation_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Staff can view own cancellation requests" ON cancellation_requests
  FOR SELECT TO authenticated
  USING (
    staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

CREATE POLICY "Admin can manage all cancellation requests" ON cancellation_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.approved = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_cancellation_requests_updated_at BEFORE UPDATE ON cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle approved cancellation requests
CREATE OR REPLACE FUNCTION process_approved_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- When a cancellation request is approved, cancel the booking
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE bookings 
    SET 
      payment_status = 'cancelled',
      notes = COALESCE(notes, '') || ' | Cancelled by admin approval. Reason: ' || NEW.reason,
      updated_at = now()
    WHERE id = NEW.booking_id;
    
    -- Set approval details
    NEW.approved_by = (SELECT id FROM users WHERE auth_id = auth.uid());
    NEW.approved_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for processing approved cancellations
CREATE TRIGGER process_approved_cancellation_trigger
  BEFORE UPDATE ON cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION process_approved_cancellation();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_booking_id ON cancellation_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON cancellation_requests(status);