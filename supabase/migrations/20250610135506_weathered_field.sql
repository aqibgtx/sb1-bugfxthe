/*
  # Add Admin User

  1. New User
    - Create admin user with email: aqibswipe@gmail.com
    - Set temp_key: 1234
    - Role: admin
    - Approved and active by default

  2. Security
    - User will be able to access admin portal immediately
    - All admin permissions will be available
*/

-- Insert admin user
INSERT INTO users (
  email,
  name,
  role,
  approved,
  active,
  created_at,
  updated_at
) VALUES (
  'aqibswipe@gmail.com',
  'Admin User',
  'admin',
  true,
  true,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  approved = true,
  active = true,
  updated_at = now();