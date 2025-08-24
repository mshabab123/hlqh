-- Database Schema for Hlqh (حلقات) Management System
-- This schema supports separate parent and student registration

-- Create database (run this first if needed)
-- CREATE DATABASE hlqh_system;

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (base table for all users)
CREATE TABLE users (
    id VARCHAR(10) PRIMARY KEY, -- Saudi ID (10 digits)
    first_name VARCHAR(50) NOT NULL,
    second_name VARCHAR(50) NOT NULL,
    third_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(10) CHECK (phone ~ '^05[0-9]{8}$'), -- Saudi mobile format
    password VARCHAR(255) NOT NULL,
    address VARCHAR(255), -- neighborhood/area
    date_of_birth DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    profile_picture_url VARCHAR(500)
);

-- Parents table
CREATE TABLE parents (
    id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    neighborhood VARCHAR(100) NOT NULL,
    is_also_student BOOLEAN DEFAULT false,
    student_school_level VARCHAR(50), -- if parent is also a student
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE students (
    id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    school_level VARCHAR(50) NOT NULL,
    parent_id VARCHAR(10) REFERENCES parents(id) ON DELETE SET NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graduation_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'suspended', 'withdrawn')),
    notes TEXT
);

-- Parent-Student relationships table (for complex family structures)
CREATE TABLE parent_student_relationships (
    id SERIAL PRIMARY KEY,
    parent_id VARCHAR(10) NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id VARCHAR(10) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) DEFAULT 'parent' CHECK (relationship_type IN ('parent', 'guardian', 'relative')),
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, student_id)
);

-- Teachers table
CREATE TABLE teachers (
    id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    specialization VARCHAR(100),
    hire_date DATE DEFAULT CURRENT_DATE,
    salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    qualifications TEXT
);

-- Administrators table
CREATE TABLE administrators (
    id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'administrator',
    hire_date DATE DEFAULT CURRENT_DATE,
    salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    qualifications TEXT,
    permissions TEXT -- JSON string for permissions
);

-- Admins table (highest level)
CREATE TABLE admins (
    id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin',
    hire_date DATE DEFAULT CURRENT_DATE,
    salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    qualifications TEXT,
    permissions TEXT, -- JSON string for permissions
    created_by VARCHAR(10) REFERENCES users(id) -- who created this admin
);

-- Supervisors table
CREATE TABLE supervisors (
    id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'supervisor',
    hire_date DATE DEFAULT CURRENT_DATE,
    salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    qualifications TEXT,
    permissions TEXT, -- JSON string for permissions
    supervised_areas TEXT -- JSON string for areas they supervise
);

-- Schools/Centers table
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(10),
    email VARCHAR(100),
    principal_id VARCHAR(10) REFERENCES teachers(id),
    established_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classes/Halaqat table
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id VARCHAR(10) REFERENCES teachers(id) ON DELETE SET NULL,
    school_level VARCHAR(50) NOT NULL,
    max_students INTEGER DEFAULT 20,
    room_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student-Class enrollments
CREATE TABLE student_enrollments (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(10) REFERENCES students(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped', 'transferred')),
    final_grade VARCHAR(10),
    notes TEXT,
    UNIQUE(student_id, class_id)
);

-- Attendance tracking
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(10) REFERENCES students(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'excused', 'late')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, class_id, date)
);

-- Notifications system
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- User sessions for security
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_students_parent_id ON students(parent_id);
CREATE INDEX idx_students_school_level ON students(school_level);
CREATE INDEX idx_parent_student_relationships_parent_id ON parent_student_relationships(parent_id);
CREATE INDEX idx_parent_student_relationships_student_id ON parent_student_relationships(student_id);
CREATE INDEX idx_student_enrollments_student_id ON student_enrollments(student_id);
CREATE INDEX idx_student_enrollments_class_id ON student_enrollments(class_id);
CREATE INDEX idx_attendance_student_class_date ON attendance(student_id, class_id, date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_teachers_status ON teachers(status);
CREATE INDEX idx_administrators_status ON administrators(status);
CREATE INDEX idx_admins_status ON admins(status);
CREATE INDEX idx_supervisors_status ON supervisors(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample school levels (enum-like data)
CREATE TABLE school_levels (
    code VARCHAR(20) PRIMARY KEY,
    name_ar VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

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
('employee', 'موظف', 'Employee', 19);

-- Sample data for testing
-- INSERT INTO users (id, first_name, second_name, third_name, last_name, email, phone, password, address, date_of_birth) VALUES
-- ('1234567890', 'أحمد', 'محمد', 'علي', 'الأحمدي', 'ahmed@example.com', '0501234567', '$2a$10$hashedpassword', 'الرياض - النسيم', '1980-01-15');