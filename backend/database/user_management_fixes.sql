-- User Management System Database Fixes
-- This script fixes the database schema to support the user management system

-- Add role field to users table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('admin', 'administrator', 'supervisor', 'teacher', 'parent', 'student'));
    END IF;
END $$;

-- Add school_id field to administrators table if it doesn't exist (UUID type to match schools.id)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administrators' AND column_name = 'school_id') THEN
        ALTER TABLE administrators ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add school_id field to supervisors table if it doesn't exist (UUID type to match schools.id)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supervisors' AND column_name = 'school_id') THEN
        ALTER TABLE supervisors ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add school_id field to teachers table if it doesn't exist (UUID type to match schools.id)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'school_id') THEN
        ALTER TABLE teachers ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update users table to set appropriate roles based on existing records
-- Set role for existing users based on their presence in role-specific tables
UPDATE users SET role = 'admin' WHERE id IN (SELECT id FROM admins);
UPDATE users SET role = 'administrator' WHERE id IN (SELECT id FROM administrators);
UPDATE users SET role = 'supervisor' WHERE id IN (SELECT id FROM supervisors);
UPDATE users SET role = 'teacher' WHERE id IN (SELECT id FROM teachers);
UPDATE users SET role = 'parent' WHERE id IN (SELECT id FROM parents);
UPDATE users SET role = 'student' WHERE id IN (SELECT id FROM students);

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_administrators_school_id ON administrators(school_id);
CREATE INDEX IF NOT EXISTS idx_supervisors_school_id ON supervisors(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);

-- Update any existing teachers/administrators/supervisors to have school associations if they don't
-- This is optional and may need manual adjustment based on your data

-- Ensure admin users exist (create a default admin if none exists)
DO $$
BEGIN
    -- Check if any admin users exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
        -- Insert a default admin user (you should change these credentials!)
        INSERT INTO users (id, first_name, second_name, third_name, last_name, email, password, role, is_active)
        VALUES ('1000000001', 'مدير', 'النظام', 'الرئيسي', 'الافتراضي', 'admin@hlqh.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', true);
        
        -- Add to admins table
        INSERT INTO admins (id, role, status, permissions)
        VALUES ('1000000001', 'admin', 'active', '["all"]');
    END IF;
END $$;

-- Add constraints and validations
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('admin', 'administrator', 'supervisor', 'teacher', 'parent', 'student'));

-- Update statistics
ANALYZE users;
ANALYZE administrators;
ANALYZE supervisors; 
ANALYZE teachers;
ANALYZE admins;

COMMIT;