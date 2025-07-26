/*
  # Fix Authentication System and Add Admin User

  1. Schema Updates
    - Add temp_key field to users table for authentication
    - Update existing authentication logic

  2. Admin User
    - Create admin user with specified credentials
    - Email: aqibswipe@gmail.com
    - Temp Key: 1234
    - Role: admin with full permissions
*/

-- Add temp_key column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'temp_key'
  ) THEN
    ALTER TABLE users ADD COLUMN temp_key text;
  END IF;
END $$;

-- Insert admin user with temp_key
INSERT INTO users (
  email,
  name,
  temp_key,
  role,
  approved,
  active,
  created_at,
  updated_at
) VALUES (
  'aqibswipe@gmail.com',
  'Admin User',
  '1234',
  'admin',
  true,
  true,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  temp_key = '1234',
  role = 'admin',
  approved = true,
  active = true,
  updated_at = now();

-- Also add some sample staff and customer users for testing
INSERT INTO users (
  email,
  name,
  temp_key,
  role,
  approved,
  active,
  created_at,
  updated_at
) VALUES 
  (
    'staff@budgetplus.com',
    'Staff User',
    'STAFF123',
    'staff',
    true,
    true,
    now(),
    now()
  ),
  (
    'customer@budgetplus.com',
    'Customer User',
    'CLIENT123',
    'customer',
    true,
    true,
    now(),
    now()
  )
ON CONFLICT (email) DO UPDATE SET
  temp_key = EXCLUDED.temp_key,
  role = EXCLUDED.role,
  approved = true,
  active = true,
  updated_at = now();