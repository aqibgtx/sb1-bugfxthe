/*
  # Create Handover and Return Invoice System

  1. New Tables
    - `handover_invoices` - Invoices generated during car handover
      - `id` (uuid, primary key)
      - `booking_id` (uuid, foreign key to bookings)
      - `invoice_number` (text, unique)
      - `invoice_type` (text, 'handover' or 'return')
      - `html_content` (text)
      - `amount` (numeric)
      - `deposit_amount` (numeric, for handover invoices)
      - `late_fee_amount` (numeric, for return invoices)
      - `proof_photo_urls` (text array)
      - `staff_id` (uuid, foreign key to users)
      - `status` (text, default 'generated')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `handover_invoices` table
    - Add policies for staff and admin access
*/

CREATE TABLE IF NOT EXISTS handover_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  invoice_type text NOT NULL CHECK (invoice_type IN ('handover', 'return')),
  html_content text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  deposit_amount numeric(10,2) DEFAULT 0,
  late_fee_amount numeric(10,2) DEFAULT 0,
  proof_photo_urls text[] DEFAULT '{}',
  staff_id uuid NOT NULL REFERENCES users(id),
  status text DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'viewed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_handover_invoices_booking_id ON handover_invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_handover_invoices_invoice_number ON handover_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_handover_invoices_type ON handover_invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_handover_invoices_staff_id ON handover_invoices(staff_id);
CREATE INDEX IF NOT EXISTS idx_handover_invoices_created_at ON handover_invoices(created_at);

-- Enable RLS
ALTER TABLE handover_invoices ENABLE ROW LEVEL SECURITY;

-- Policies for handover_invoices
CREATE POLICY "Staff can view own handover invoices"
  ON handover_invoices
  FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all handover invoices"
  ON handover_invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND role = 'admin' 
      AND approved = true
    )
  );

CREATE POLICY "Staff can create handover invoices"
  ON handover_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    staff_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all handover invoices"
  ON handover_invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND role = 'admin' 
      AND approved = true
    )
  );

-- Function to generate handover invoice numbers
CREATE OR REPLACE FUNCTION generate_handover_invoice_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_number text;
  counter integer;
BEGIN
  -- Get current date in YYYYMMDD format
  SELECT 'HRI-' || to_char(now(), 'YYYYMMDD') || '-' INTO new_number;
  
  -- Get the next sequence number for today
  SELECT COALESCE(MAX(
    CASE 
      WHEN invoice_number ~ ('^HRI-' || to_char(now(), 'YYYYMMDD') || '-[0-9]+$')
      THEN CAST(substring(invoice_number from '[0-9]+$') AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO counter
  FROM handover_invoices
  WHERE invoice_number LIKE 'HRI-' || to_char(now(), 'YYYYMMDD') || '-%';
  
  -- Format with leading zeros
  new_number := new_number || lpad(counter::text, 4, '0');
  
  RETURN new_number;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_handover_invoices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_handover_invoices_updated_at
  BEFORE UPDATE ON handover_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_handover_invoices_updated_at();