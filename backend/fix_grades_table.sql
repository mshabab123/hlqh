-- Fix semester/grading system database structure
-- This script ensures all required tables exist with the correct schema

-- First, ensure semesters table exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'semesters'
    ) THEN
        CREATE TABLE semesters (
            id SERIAL PRIMARY KEY,
            type VARCHAR(20) NOT NULL CHECK (type IN ('first', 'second', 'summer')),
            year INTEGER NOT NULL,
            display_name VARCHAR(100),
            start_date DATE,
            end_date DATE,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(type, year)
        );
        
        CREATE INDEX IF NOT EXISTS idx_semesters_year_type ON semesters(year, type);
        RAISE NOTICE 'Created semesters table';
    ELSE
        RAISE NOTICE 'Semesters table already exists';
    END IF;
END $$;

-- Second, ensure semester_courses table exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'semester_courses'
    ) THEN
        CREATE TABLE semester_courses (
            id SERIAL PRIMARY KEY,
            semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
            school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
            class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            percentage DECIMAL(5,2) DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
            requires_surah BOOLEAN DEFAULT false,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(semester_id, school_id, name)
        );
        
        CREATE INDEX IF NOT EXISTS idx_semester_courses_semester_school ON semester_courses(semester_id, school_id);
        CREATE INDEX IF NOT EXISTS idx_semester_courses_class ON semester_courses(class_id);
        RAISE NOTICE 'Created semester_courses table';
    ELSE
        RAISE NOTICE 'semester_courses table already exists';
    END IF;
END $$;

-- Third, check if grades table exists and create it if not
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'grades'
    ) THEN
        CREATE TABLE grades (
            id SERIAL PRIMARY KEY,
            student_id VARCHAR(10) REFERENCES students(id) ON DELETE CASCADE,
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
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_grades_student_semester ON grades(student_id, semester_id);
        CREATE INDEX IF NOT EXISTS idx_grades_course_semester ON grades(course_id, semester_id);
        
        RAISE NOTICE 'Created grades table with correct structure';
    ELSE
        -- Table exists, check and add missing columns
        RAISE NOTICE 'Grades table exists, checking for missing columns...';
        
        -- Check if course_id column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'grades' 
            AND column_name = 'course_id'
        ) THEN
            ALTER TABLE grades ADD COLUMN course_id INTEGER REFERENCES semester_courses(id) ON DELETE CASCADE;
            CREATE INDEX IF NOT EXISTS idx_grades_course_semester ON grades(course_id, semester_id);
            RAISE NOTICE 'Added missing course_id column to grades table';
        END IF;
        
        -- Check if semester_id column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'grades' 
            AND column_name = 'semester_id'
        ) THEN
            ALTER TABLE grades ADD COLUMN semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE;
            CREATE INDEX IF NOT EXISTS idx_grades_student_semester ON grades(student_id, semester_id);
            RAISE NOTICE 'Added missing semester_id column to grades table';
        END IF;
        
        -- Check if student_id column exists with correct type
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'grades' 
            AND column_name = 'student_id'
        ) THEN
            ALTER TABLE grades ADD COLUMN student_id VARCHAR(10) REFERENCES students(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added missing student_id column to grades table';
        END IF;
    END IF;
END $$;

-- Ensure semester_courses table has class_id column (for class-specific courses)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'semester_courses' 
        AND column_name = 'class_id'
    ) THEN
        ALTER TABLE semester_courses ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_semester_courses_class ON semester_courses(class_id);
        RAISE NOTICE 'Added class_id column to semester_courses table';
    ELSE
        RAISE NOTICE 'semester_courses table already has class_id column';
    END IF;
END $$;

-- Insert sample semester data if table is empty
DO $$ 
BEGIN
    IF (SELECT COUNT(*) FROM semesters) = 0 THEN
        INSERT INTO semesters (type, year, display_name, start_date, end_date) 
        VALUES 
            ('first', 2025, 'الفصل الأول 2025', '2025-09-01', '2025-01-31'),
            ('second', 2025, 'الفصل الثاني 2025', '2025-02-01', '2025-06-30'),
            ('summer', 2025, 'الفصل الصيفي 2025', '2025-07-01', '2025-08-31');
        RAISE NOTICE 'Inserted sample semester data for 2025';
    ELSE
        RAISE NOTICE 'Semesters table already has data';
    END IF;
END $$;

RAISE NOTICE 'Database structure check and setup completed';