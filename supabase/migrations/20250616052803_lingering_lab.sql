/*
  # Add user rejection handling

  1. Database Function
    - Create function to handle user rejection and cleanup
    - Automatically set active = false when user is rejected

  2. Trigger
    - Add trigger to automatically handle user status changes
    - Maintain data consistency between registration_status and active/approved fields

  3. Security
    - Ensure proper access control for user rejection workflow
*/

-- Function to handle user rejection
CREATE OR REPLACE FUNCTION handle_user_rejection()
RETURNS TRIGGER AS $$
BEGIN
  -- When registration_status changes to rejected, ensure user is inactive
  IF NEW.registration_status = 'rejected' AND OLD.registration_status != 'rejected' THEN
    NEW.approved = false;
    NEW.active = false;
  END IF;
  
  -- When registration_status changes to approved, user can be activated
  IF NEW.registration_status = 'approved' AND OLD.registration_status != 'approved' THEN
    NEW.approved = true;
    -- Note: active status should be set manually by admin for security
  END IF;
  
  -- When registration_status changes to pending, reset approval
  IF NEW.registration_status = 'pending' AND OLD.registration_status != 'pending' THEN
    NEW.approved = false;
    NEW.active = false;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user rejection handling
DROP TRIGGER IF EXISTS handle_user_rejection_trigger ON users;
CREATE TRIGGER handle_user_rejection_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION handle_user_rejection();

-- Ensure data consistency for existing users
UPDATE users SET 
  approved = CASE 
    WHEN registration_status = 'approved' THEN true 
    ELSE false 
  END,
  active = CASE 
    WHEN registration_status = 'approved' AND active = true THEN true 
    ELSE false 
  END
WHERE registration_status IS NOT NULL;