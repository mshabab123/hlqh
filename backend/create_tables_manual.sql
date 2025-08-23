-- Manual table creation script
-- Run this if the migration script didn't work

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Parents table
CREATE TABLE IF NOT EXISTS parents (
    id VARCHAR(10) PRIMARY KEY,
    neighborhood VARCHAR(100) NOT NULL,
    is_also_student BOOLEAN DEFAULT false,
    student_school_level VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- Students table  
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(10) PRIMARY KEY,
    school_level VARCHAR(50) NOT NULL,
    parent_id VARCHAR(10),
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graduation_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'suspended', 'withdrawn')),
    notes TEXT,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL
);

-- Parent-Student relationships
CREATE TABLE IF NOT EXISTS parent_student_relationships (
    id SERIAL PRIMARY KEY,
    parent_id VARCHAR(10) NOT NULL,
    student_id VARCHAR(10) NOT NULL,
    relationship_type VARCHAR(20) DEFAULT 'parent' CHECK (relationship_type IN ('parent', 'guardian', 'relative')),
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(parent_id, student_id)
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
    id VARCHAR(10) PRIMARY KEY,
    specialization VARCHAR(100),
    hire_date DATE DEFAULT CURRENT_DATE,
    salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    qualifications TEXT,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- Student enrollments
CREATE TABLE IF NOT EXISTS student_enrollments (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    class_id INTEGER NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped', 'transferred')),
    final_grade VARCHAR(10),
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(student_id, class_id)
);

-- Attendance tracking
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    class_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'excused', 'late')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(student_id, class_id, date)
);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(10) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- School levels reference table
CREATE TABLE IF NOT EXISTS school_levels (
    code VARCHAR(20) PRIMARY KEY,
    name_ar VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Insert school levels data
INSERT INTO school_levels (code, name_ar, name_en, sort_order) VALUES
('kg1', 'روضة أولى', 'Kindergarten 1', 1),
('kg2', 'روضة ثانية', 'Kindergarten 2', 2),
('grade1', 'أولى', 'Grade 1', 3),
('grade2', 'ثانية', 'Grade 2', 4),
('grade3', 'ثالثة', 'Grade 3', 5),
('grade4', 'رابعة', 'Grade 4', 6),
('grade5', 'خامسة', 'Grade 5', 7),
('grade6', 'سادسة', 'Grade 6', 8),
('grade7', 'أولى متوسط', 'Grade 7', 9),
('grade8', 'ثاني متوسط', 'Grade 8', 10),
('grade9', 'ثالث متوسط', 'Grade 9', 11),
('grade10', 'أولى ثانوي', 'Grade 10', 12),
('grade11', 'ثاني ثانوي', 'Grade 11', 13),
('grade12', 'ثالث ثانوي', 'Grade 12', 14),
('university', 'جامعة', 'University', 15),
('graduate', 'اكمل الجامعة', 'Graduate', 16),
('master', 'ماجستير', 'Masters', 17),
('phd', 'دكتوراه', 'PhD', 18),
('employee', 'موظف', 'Employee', 19)
ON CONFLICT (code) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_school_level ON students(school_level);
CREATE INDEX IF NOT EXISTS idx_parent_student_relationships_parent_id ON parent_student_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_relationships_student_id ON parent_student_relationships(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_id ON student_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_class_date ON attendance(student_id, class_id, date);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Display success message
SELECT 'Tables created successfully! Check with: SELECT table_name FROM information_schema.tables WHERE table_schema = ''public'' ORDER BY table_name;' as result;