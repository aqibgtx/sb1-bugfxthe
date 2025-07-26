/*
  # Add Invoice Generation System

  1. New Table
    - `invoices` - Store generated invoices with HTML content and links
    - Links to bookings for invoice generation
    - Tracks email sending status

  2. Security
    - Enable RLS on invoices table
    - Add policies for staff and admin access
    - Customers can view their own invoices

  3. Features
    - Generate invoice HTML content
    - Create shareable preview links
    - Track email delivery status
*/

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  invoice_number text UNIQUE NOT NULL,
  html_content text,
  amount decimal(10,2) NOT NULL,
  status text CHECK (status IN ('generated', 'sent', 'paid', 'cancelled')) DEFAULT 'generated',
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE customer_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

CREATE POLICY "Staff and admin can manage invoices" ON invoices
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  invoice_number text;
BEGIN
  -- Get the next invoice number
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS integer)), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number ~ '^INV[0-9]+$';
  
  -- Format as INV000001
  invoice_number := 'INV' || LPAD(next_number::text, 6, '0');
  
  RETURN invoice_number;
END;
$$ language 'plpgsql';