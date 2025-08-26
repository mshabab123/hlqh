-- Teacher-Class Assignment Table for Many-to-Many Relationship
-- This allows teachers to be assigned to multiple classes

CREATE TABLE IF NOT EXISTS teacher_class_assignments (
    id SERIAL PRIMARY KEY,
    teacher_id VARCHAR(10) NOT NULL,
    class_id UUID NOT NULL,
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Ensure unique assignment (prevent duplicate assignments)
    UNIQUE(teacher_id, class_id)
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher ON teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_class ON teacher_class_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_active ON teacher_class_assignments(is_active);

-- Function to get classes for a teacher
CREATE OR REPLACE FUNCTION get_teacher_classes(p_teacher_id VARCHAR(10))
RETURNS TABLE(
    class_id UUID,
    class_name VARCHAR,
    school_name VARCHAR,
    max_students INTEGER,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as class_id,
        c.name as class_name,
        s.name as school_name,
        c.max_students,
        c.is_active
    FROM teacher_class_assignments tca
    JOIN classes c ON tca.class_id = c.id
    JOIN schools s ON c.school_id = s.id
    WHERE tca.teacher_id = p_teacher_id 
    AND tca.is_active = TRUE
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get teachers for a class
CREATE OR REPLACE FUNCTION get_class_teachers(p_class_id UUID)
RETURNS TABLE(
    teacher_id VARCHAR(10),
    teacher_name VARCHAR,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as teacher_id,
        CONCAT(u.first_name, ' ', u.last_name) as teacher_name,
        u.is_active
    FROM teacher_class_assignments tca
    JOIN teachers t ON tca.teacher_id = t.id
    JOIN users u ON t.id = u.id
    WHERE tca.class_id = p_class_id 
    AND tca.is_active = TRUE
    ORDER BY u.first_name, u.last_name;
END;
$$ LANGUAGE plpgsql;