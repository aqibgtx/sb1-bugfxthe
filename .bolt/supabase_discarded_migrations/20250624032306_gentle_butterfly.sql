/*
  # Fix Storage RLS Policies for Payment Receipts

  1. Storage Policies
    - Allow authenticated users to upload payment receipts
    - Allow users to read their own uploaded receipts
    - Allow staff and admin to read all receipts

  2. Security
    - Enable RLS on storage objects
    - Create policies for INSERT, SELECT operations on receipts folder
*/

-- Create policy to allow authenticated users to upload payment receipts
CREATE POLICY "Allow authenticated users to upload payment receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'budget-plus-files' 
  AND (storage.foldername(name))[1] = 'receipts'
);

-- Create policy to allow users to read their own payment receipts
CREATE POLICY "Allow users to read own payment receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'budget-plus-files' 
  AND (storage.foldername(name))[1] = 'receipts'
  AND (
    -- Allow if user uploaded the file (extract booking_id from filename and check ownership)
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN users u ON u.id = b.customer_id OR u.id = b.staff_id
      WHERE u.auth_id = auth.uid()
      AND name LIKE '%' || b.id::text || '%'
    )
    OR
    -- Allow staff and admin to read all receipts
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND u.role IN ('staff', 'admin')
      AND u.approved = true
    )
  )
);

-- Create policy to allow staff and admin to manage all payment receipts
CREATE POLICY "Allow staff and admin to manage payment receipts"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'budget-plus-files' 
  AND (storage.foldername(name))[1] = 'receipts'
  AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_id = auth.uid()
    AND u.role IN ('staff', 'admin')
    AND u.approved = true
  )
);