-- Create semesters table
CREATE TABLE IF NOT EXISTS semesters (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('first', 'second', 'summer')),
    year INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, year)
);

-- Create semester_courses table
CREATE TABLE IF NOT EXISTS semester_courses (
    id SERIAL PRIMARY KEY,
    semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
    requires_surah BOOLEAN DEFAULT false,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(semester_id, school_id, name)
);

-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES semester_courses(id) ON DELETE CASCADE,
    semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
    score DECIMAL(5,2) DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    from_surah INTEGER CHECK (from_surah >= 1 AND from_surah <= 114),
    from_ayah INTEGER CHECK (from_ayah >= 1),
    to_surah INTEGER CHECK (to_surah >= 1 AND to_surah <= 114),
    to_ayah INTEGER CHECK (to_ayah >= 1),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id, semester_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_semesters_year_type ON semesters(year, type);
CREATE INDEX IF NOT EXISTS idx_semester_courses_semester_school ON semester_courses(semester_id, school_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_semester ON grades(student_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_grades_course_semester ON grades(course_id, semester_id);

-- Insert sample data for current academic year
INSERT INTO semesters (type, year, display_name, start_date, end_date) 
VALUES 
    ('first', 2025, 'الفصل الأول 2025', '2025-09-01', '2025-01-31'),
    ('second', 2025, 'الفصل الثاني 2025', '2025-02-01', '2025-06-30'),
    ('summer', 2025, 'الفصل الصيفي 2025', '2025-07-01', '2025-08-31')
ON CONFLICT (type, year) DO NOTHING;

-- Add default courses for existing schools (this will be done by the application)
-- The application will create default courses when a new semester is added