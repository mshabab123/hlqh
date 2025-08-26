-- Grades table migration script
-- This script updates the grades table schema to support the new grading system
-- Run this script on your database to add missing columns and update existing data

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
-- This assumes existing grades might be stored in a 'score' column
-- Adjust this based on your current table structure
UPDATE grades 
SET grade_value = COALESCE(grade_value, score, 0)
WHERE grade_value IS NULL;

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
ALTER TABLE grades 
ADD CONSTRAINT IF NOT EXISTS fk_grades_class_id 
FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

ALTER TABLE grades 
ADD CONSTRAINT IF NOT EXISTS fk_grades_semester_id 
FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grades_class_id ON grades(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_semester_id ON grades(semester_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_course ON grades(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_grades_date ON grades(date_graded);

-- Display summary of changes
SELECT 
    'Grades table migration completed' as status,
    COUNT(*) as total_grades,
    COUNT(class_id) as grades_with_class,
    COUNT(semester_id) as grades_with_semester,
    COUNT(grade_value) as grades_with_value
FROM grades;