-- Migration: Add user activation system
-- Created: 2024-12-26
-- Description: Adds is_active column and related functionality for user account activation

-- Add is_active column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Set existing users as active (so current users don't get locked out)
UPDATE users 
SET is_active = true 
WHERE is_active IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE users 
ALTER COLUMN is_active SET NOT NULL;

-- Add index for better performance on is_active queries
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create function to activate users (for admin use)
CREATE OR REPLACE FUNCTION activate_user(user_email_param VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET is_active = true, 
        updated_at = NOW()
    WHERE email = user_email_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to deactivate users (for admin use)  
CREATE OR REPLACE FUNCTION deactivate_user(user_email_param VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET is_active = false, 
        updated_at = NOW()
    WHERE email = user_email_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create view for admin to see user activation status
CREATE OR REPLACE VIEW user_activation_status AS
SELECT 
    id,
    first_name,
    last_name, 
    email,
    role,
    is_active,
    created_at,
    updated_at,
    CASE 
        WHEN is_active = true THEN 'مفعل'
        ELSE 'غير مفعل'
    END as status_arabic
FROM users
ORDER BY created_at DESC;

-- Output summary
DO $$
DECLARE
    total_users INTEGER;
    active_users INTEGER;
    inactive_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO active_users FROM users WHERE is_active = true;
    SELECT COUNT(*) INTO inactive_users FROM users WHERE is_active = false;
    
    RAISE NOTICE 'User activation system migration completed successfully!';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Active users: %', active_users;
    RAISE NOTICE 'Inactive users: %', inactive_users;
    RAISE NOTICE 'Admin can now use: SELECT * FROM user_activation_status;';
END $$;