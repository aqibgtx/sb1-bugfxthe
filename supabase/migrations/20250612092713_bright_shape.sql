/*
  # Fix RLS policy for cancellation requests

  1. Security Updates
    - Update INSERT policy for cancellation_requests table
    - Ensure staff can create cancellation requests for their own bookings
    - Maintain security by validating staff ownership of bookings

  2. Changes
    - Drop existing INSERT policy
    - Create new INSERT policy that properly validates staff permissions
    - Ensure staff can only create cancellation requests for bookings they manage
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Staff can create cancellation requests" ON cancellation_requests;

-- Create a new INSERT policy that properly validates staff permissions
CREATE POLICY "Staff can create cancellation requests" ON cancellation_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM users u 
    WHERE u.auth_id = auth.uid() 
    AND u.role = ANY (ARRAY['staff'::text, 'admin'::text]) 
    AND u.approved = true
    AND u.id = staff_id
  )
  AND
  EXISTS (
    SELECT 1 
    FROM bookings b 
    WHERE b.id = booking_id 
    AND b.staff_id = staff_id
  )
);