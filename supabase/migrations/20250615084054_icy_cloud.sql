/*
  # Add referred_by field to users table

  1. Schema Changes
    - Add referred_by field to users table to track referral relationships
    - Create index for better performance on referral queries
    - Update existing data if needed

  2. Security
    - Maintain existing RLS policies
    - Ensure referral tracking works with current authentication system
*/

-- Add referred_by column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE users ADD COLUMN referred_by uuid REFERENCES users(id);
  END IF;
END $$;

-- Create index for better performance on referral queries
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- Add comment to document the field
COMMENT ON COLUMN users.referred_by IS 'References the staff member who referred this customer';