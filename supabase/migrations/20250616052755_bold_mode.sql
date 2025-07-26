/*
  # Add registration_status enum to users table

  1. Schema Changes
    - Create registration_status enum type
    - Add registration_status column to users table
    - Set default value to 'pending'
    - Create index for better performance

  2. Data Migration
    - Update existing users based on their current approved status
    - Ensure data consistency

  3. Security
    - Maintain existing RLS policies
    - Update policies to use registration_status where appropriate
*/

-- Create registration_status enum type
CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected');

-- Add registration_status column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_status registration_status DEFAULT 'pending';

-- Create index for better performance on registration status queries
CREATE INDEX IF NOT EXISTS idx_users_registration_status ON users(registration_status);

-- Migrate existing data: set registration_status based on current approved status
UPDATE users SET registration_status = 
  CASE 
    WHEN approved = true THEN 'approved'::registration_status
    ELSE 'pending'::registration_status
  END
WHERE registration_status IS NULL OR registration_status = 'pending';

-- Update RLS policies to use registration_status for admin access
DROP POLICY IF EXISTS "Admin can manage all users" ON users;
CREATE POLICY "Admin can manage all users" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.registration_status = 'approved'::registration_status
    )
  );

DROP POLICY IF EXISTS "Staff and admin can read all users" ON users;
CREATE POLICY "Staff and admin can read all users" ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('staff', 'admin')
      AND u.registration_status = 'approved'::registration_status
    )
  );

-- Update other policies that reference approved status
UPDATE users SET approved = true WHERE registration_status = 'approved';
UPDATE users SET approved = false WHERE registration_status IN ('pending', 'rejected');