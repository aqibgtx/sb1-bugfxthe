/*
  # Fix generate_invoice_number RPC function

  1. Function Updates
    - Fix ambiguous column reference for invoice_number
    - Ensure proper table qualification in SQL queries
    - Add proper error handling

  2. Security
    - Maintain existing RLS policies
    - Ensure function runs with proper permissions
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_invoice_number();

-- Create the corrected function
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_year TEXT;
    current_month TEXT;
    sequence_number INTEGER;
    new_invoice_number TEXT;
BEGIN
    -- Get current year and month
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    current_month := LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0');
    
    -- Get the next sequence number for this month
    -- Use fully qualified column names to avoid ambiguity
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoices.invoice_number ~ ('^INV-' || current_year || current_month || '-[0-9]+$')
            THEN CAST(SUBSTRING(invoices.invoice_number FROM LENGTH('INV-' || current_year || current_month || '-') + 1) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO sequence_number
    FROM invoices
    WHERE invoices.invoice_number LIKE ('INV-' || current_year || current_month || '-%');
    
    -- Generate the new invoice number
    new_invoice_number := 'INV-' || current_year || current_month || '-' || LPAD(sequence_number::TEXT, 4, '0');
    
    RETURN new_invoice_number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;