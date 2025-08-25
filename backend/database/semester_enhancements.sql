-- Add vacation/holiday support and working days to semesters
-- First, add columns to semesters table for vacation management

-- Add new columns to semesters table
ALTER TABLE semesters 
ADD COLUMN IF NOT EXISTS vacation_days JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS weekend_days JSONB DEFAULT '[5, 6]', -- Friday=5, Saturday=6 (ISO weekdays)
ADD COLUMN IF NOT EXISTS working_days_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_days_count INTEGER DEFAULT 0;

-- Create semester_attendance table for tracking student attendance
CREATE TABLE IF NOT EXISTS semester_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id VARCHAR(10) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    is_present BOOLEAN NOT NULL DEFAULT false,
    is_explicit BOOLEAN DEFAULT false, -- true if teacher explicitly marked attendance
    has_grade BOOLEAN DEFAULT false, -- true if student received a grade on this day
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(semester_id, class_id, student_id, attendance_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_semester_attendance_semester ON semester_attendance(semester_id);
CREATE INDEX IF NOT EXISTS idx_semester_attendance_class ON semester_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_semester_attendance_student ON semester_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_attendance_date ON semester_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_semester_attendance_composite ON semester_attendance(semester_id, class_id, student_id);

-- Create function to calculate working days for a semester
CREATE OR REPLACE FUNCTION calculate_working_days(
    start_date DATE,
    end_date DATE,
    weekend_days JSONB DEFAULT '[5, 6]',
    vacation_days JSONB DEFAULT '[]'
) RETURNS INTEGER AS $$
DECLARE
    current_date DATE;
    working_days INTEGER := 0;
    total_days INTEGER := 0;
    day_of_week INTEGER;
    vacation_list DATE[];
    is_vacation BOOLEAN;
BEGIN
    -- Convert vacation_days JSONB to DATE array
    SELECT ARRAY(SELECT (value::text)::date FROM jsonb_array_elements(vacation_days)) INTO vacation_list;
    
    current_date := start_date;
    
    WHILE current_date <= end_date LOOP
        total_days := total_days + 1;
        day_of_week := EXTRACT(ISODOW FROM current_date); -- 1=Monday, 7=Sunday
        
        -- Check if current day is not a weekend
        IF NOT (weekend_days ? day_of_week::text) THEN
            -- Check if current day is not a vacation day
            is_vacation := current_date = ANY(vacation_list);
            
            IF NOT is_vacation THEN
                working_days := working_days + 1;
            END IF;
        END IF;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN working_days;
END;
$$ LANGUAGE plpgsql;

-- Create function to update semester working days
CREATE OR REPLACE FUNCTION update_semester_working_days(semester_id UUID) RETURNS VOID AS $$
DECLARE
    semester_record RECORD;
    working_days_calc INTEGER;
    total_days_calc INTEGER;
BEGIN
    SELECT * INTO semester_record FROM semesters WHERE id = semester_id;
    
    IF semester_record.start_date IS NULL OR semester_record.end_date IS NULL THEN
        RETURN;
    END IF;
    
    -- Calculate total days
    total_days_calc := (semester_record.end_date - semester_record.start_date) + 1;
    
    -- Calculate working days
    working_days_calc := calculate_working_days(
        semester_record.start_date,
        semester_record.end_date,
        COALESCE(semester_record.weekend_days, '[5, 6]'),
        COALESCE(semester_record.vacation_days, '[]')
    );
    
    -- Update the semester record
    UPDATE semesters 
    SET 
        working_days_count = working_days_calc,
        total_days_count = total_days_calc
    WHERE id = semester_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update working days when semester dates or vacation days change
CREATE OR REPLACE FUNCTION trigger_update_working_days() RETURNS TRIGGER AS $$
BEGIN
    -- Update working days calculation
    PERFORM update_semester_working_days(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tr_semester_working_days ON semesters;
CREATE TRIGGER tr_semester_working_days
    AFTER INSERT OR UPDATE OF start_date, end_date, weekend_days, vacation_days
    ON semesters
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_working_days();

-- Update existing semesters with default weekend days and calculate working days
UPDATE semesters 
SET 
    weekend_days = '[5, 6]',
    vacation_days = '[]'
WHERE weekend_days IS NULL OR vacation_days IS NULL;

-- Recalculate working days for all existing semesters
DO $$
DECLARE
    sem RECORD;
BEGIN
    FOR sem IN SELECT id FROM semesters WHERE start_date IS NOT NULL AND end_date IS NOT NULL LOOP
        PERFORM update_semester_working_days(sem.id);
    END LOOP;
END $$;