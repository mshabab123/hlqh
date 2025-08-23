-- Migration to set default status as 'inactive' for all user role tables
-- This ensures all new registrations require admin approval

-- Update teachers table default status
ALTER TABLE teachers ALTER COLUMN status SET DEFAULT 'inactive';

-- Update administrators table default status  
ALTER TABLE administrators ALTER COLUMN status SET DEFAULT 'inactive';

-- Update admins table default status
ALTER TABLE admins ALTER COLUMN status SET DEFAULT 'inactive';

-- Update supervisors table default status
ALTER TABLE supervisors ALTER COLUMN status SET DEFAULT 'inactive';

-- Also update the users table to have is_active default to false
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT false;