-- Migration: Update grades table schema for new grading system
-- Created: 2024-12-26
-- 
-- This migration adds required columns and updates existing data
-- to support the enhanced grading system with class associations

-- Add missing columns if they don't exist
ALTER TABLE grades 
ADD COLUMN IF NOT EXISTS class_id UUID,
ADD COLUMN IF NOT EXISTS semester_id INTEGER,
ADD COLUMN IF NOT EXISTS grade_value DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS max_grade INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS grade_type VARCHAR(50) DEFAULT 'assignment',
ADD COLUMN IF NOT EXISTS start_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS end_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS date_graded TIMESTAMP;

-- Update date_graded for existing records that don't have it
UPDATE grades 
SET date_graded = COALESCE(updated_at, created_at, NOW())
WHERE date_graded IS NULL;

-- Update class_id for existing grades that don't have it
-- This links grades to classes through student enrollments
UPDATE grades 
SET class_id = (
    SELECT se.class_id 
    FROM students s 
    JOIN student_enrollments se ON s.id = se.student_id 
    WHERE s.id = grades.student_id 
    AND se.status = 'enrolled' 
    ORDER BY se.enrollment_date DESC
    LIMIT 1
) 
WHERE class_id IS NULL;

-- Update semester_id for existing grades based on class semester
UPDATE grades 
SET semester_id = (
    SELECT c.semester_id 
    FROM classes c 
    WHERE c.id = grades.class_id
)
WHERE semester_id IS NULL AND class_id IS NOT NULL;

-- Set default values for grade_value if it's null
-- Copy from score column if it exists, otherwise set to 0
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='grades' AND column_name='score') THEN
        UPDATE grades 
        SET grade_value = COALESCE(grade_value, score, 0)
        WHERE grade_value IS NULL;
    ELSE
        UPDATE grades 
        SET grade_value = COALESCE(grade_value, 0)
        WHERE grade_value IS NULL;
    END IF;
END $$;

-- Set default max_grade if it's null
UPDATE grades 
SET max_grade = COALESCE(max_grade, 100)
WHERE max_grade IS NULL;

-- Set default grade_type if it's null
UPDATE grades 
SET grade_type = COALESCE(grade_type, 'assignment')
WHERE grade_type IS NULL;

-- Add constraints after data is cleaned up
-- Make class_id NOT NULL (all grades must be associated with a class)
ALTER TABLE grades 
ALTER COLUMN class_id SET NOT NULL;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_grades_class_id') THEN
        ALTER TABLE grades 
        ADD CONSTRAINT fk_grades_class_id 
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_grades_semester_id') THEN
        ALTER TABLE grades 
        ADD CONSTRAINT fk_grades_semester_id 
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grades_class_id ON grades(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_semester_id ON grades(semester_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_course ON grades(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_grades_date ON grades(date_graded);

-- Output summary
DO $$
DECLARE
    total_grades INTEGER;
    grades_with_class INTEGER;
    grades_with_semester INTEGER;
    grades_with_value INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_grades FROM grades;
    SELECT COUNT(class_id) INTO grades_with_class FROM grades;
    SELECT COUNT(semester_id) INTO grades_with_semester FROM grades;
    SELECT COUNT(grade_value) INTO grades_with_value FROM grades;
    
    RAISE NOTICE 'Grades table migration completed successfully!';
    RAISE NOTICE 'Total grades: %', total_grades;
    RAISE NOTICE 'Grades with class_id: %', grades_with_class;
    RAISE NOTICE 'Grades with semester_id: %', grades_with_semester;
    RAISE NOTICE 'Grades with grade_value: %', grades_with_value;
END $$;