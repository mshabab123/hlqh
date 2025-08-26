-- Attendance System Database Tables

-- 1. Class Schedule Table (defines working days and times for each class)
CREATE TABLE IF NOT EXISTS class_schedules (
    id SERIAL PRIMARY KEY,
    class_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(class_id, day_of_week)
);

-- 2. Sessions Table (individual class sessions)
CREATE TABLE IF NOT EXISTS class_sessions (
    id SERIAL PRIMARY KEY,
    class_id UUID NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled
    notes TEXT,
    created_by VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(class_id, session_date)
);

-- 3. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    student_id VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL, -- present, absent_excused, absent_unexcused
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marked_by VARCHAR(10),
    notes TEXT,
    is_manual BOOLEAN DEFAULT FALSE, -- TRUE if manually marked, FALSE if auto-calculated
    grade_based BOOLEAN DEFAULT FALSE, -- TRUE if marked based on grade entry
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(session_id, student_id)
);

-- 4. Attendance Statistics Table (for performance - calculated values)
CREATE TABLE IF NOT EXISTS attendance_statistics (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    class_id UUID NOT NULL,
    semester_id INTEGER,
    total_sessions INTEGER DEFAULT 0,
    present_count INTEGER DEFAULT 0,
    absent_excused_count INTEGER DEFAULT 0,
    absent_unexcused_count INTEGER DEFAULT 0,
    attendance_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    UNIQUE(student_id, class_id, semester_id)
);

-- 5. Absence Excuses Table
CREATE TABLE IF NOT EXISTS absence_excuses (
    id SERIAL PRIMARY KEY,
    attendance_record_id INTEGER NOT NULL,
    excuse_type VARCHAR(50) NOT NULL, -- medical, family_emergency, official, other
    excuse_details TEXT,
    supporting_document VARCHAR(255), -- file path if document uploaded
    submitted_by VARCHAR(10), -- parent/guardian who submitted excuse
    reviewed_by VARCHAR(10), -- teacher/admin who reviewed
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_schedules_class_id ON class_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_class_date ON class_sessions(class_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_statistics_student_class ON attendance_statistics(student_id, class_id);
CREATE INDEX IF NOT EXISTS idx_absence_excuses_record ON absence_excuses(attendance_record_id);

-- Function to auto-generate sessions based on class schedule
CREATE OR REPLACE FUNCTION generate_class_sessions(
    p_class_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS INTEGER AS $$
DECLARE
    schedule_rec RECORD;
    session_date DATE;
    sessions_created INTEGER := 0;
BEGIN
    -- Get class schedule
    FOR schedule_rec IN 
        SELECT day_of_week, start_time, end_time 
        FROM class_schedules 
        WHERE class_id = p_class_id AND is_active = TRUE
    LOOP
        session_date := p_start_date;
        
        -- Find first occurrence of the day
        WHILE EXTRACT(DOW FROM session_date) != schedule_rec.day_of_week LOOP
            session_date := session_date + INTERVAL '1 day';
        END LOOP;
        
        -- Generate sessions for all occurrences
        WHILE session_date <= p_end_date LOOP
            INSERT INTO class_sessions (class_id, session_date, start_time, end_time)
            VALUES (p_class_id, session_date, schedule_rec.start_time, schedule_rec.end_time)
            ON CONFLICT (class_id, session_date) DO NOTHING;
            
            IF FOUND THEN
                sessions_created := sessions_created + 1;
            END IF;
            
            session_date := session_date + INTERVAL '7 days';
        END LOOP;
    END LOOP;
    
    RETURN sessions_created;
END;
$$ LANGUAGE plpgsql;

-- Function to update attendance statistics
CREATE OR REPLACE FUNCTION update_attendance_statistics(
    p_student_id VARCHAR(10),
    p_class_id UUID,
    p_semester_id INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    stats_rec RECORD;
BEGIN
    -- Calculate statistics
    SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN ar.status = 'absent_excused' THEN 1 END) as absent_excused_count,
        COUNT(CASE WHEN ar.status = 'absent_unexcused' THEN 1 END) as absent_unexcused_count
    INTO stats_rec
    FROM class_sessions cs
    LEFT JOIN attendance_records ar ON cs.id = ar.session_id AND ar.student_id = p_student_id
    WHERE cs.class_id = p_class_id
    AND (p_semester_id IS NULL OR cs.session_date BETWEEN 
         (SELECT start_date FROM semesters WHERE id = p_semester_id) AND 
         (SELECT end_date FROM semesters WHERE id = p_semester_id));
    
    -- Insert or update statistics
    INSERT INTO attendance_statistics (
        student_id, class_id, semester_id, total_sessions, 
        present_count, absent_excused_count, absent_unexcused_count,
        attendance_percentage, last_updated
    ) VALUES (
        p_student_id, p_class_id, p_semester_id, stats_rec.total_sessions,
        stats_rec.present_count, stats_rec.absent_excused_count, stats_rec.absent_unexcused_count,
        CASE WHEN stats_rec.total_sessions > 0 
             THEN ROUND((stats_rec.present_count * 100.0 / stats_rec.total_sessions), 2)
             ELSE 0 END,
        NOW()
    )
    ON CONFLICT (student_id, class_id, semester_id) 
    DO UPDATE SET
        total_sessions = EXCLUDED.total_sessions,
        present_count = EXCLUDED.present_count,
        absent_excused_count = EXCLUDED.absent_excused_count,
        absent_unexcused_count = EXCLUDED.absent_unexcused_count,
        attendance_percentage = EXCLUDED.attendance_percentage,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update statistics when attendance records change
CREATE OR REPLACE FUNCTION trigger_update_attendance_stats() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Get class_id from session
        PERFORM update_attendance_statistics(
            NEW.student_id,
            (SELECT class_id FROM class_sessions WHERE id = NEW.session_id),
            NULL -- We'll add semester logic later
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Get class_id from session
        PERFORM update_attendance_statistics(
            OLD.student_id,
            (SELECT class_id FROM class_sessions WHERE id = OLD.session_id),
            NULL
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS attendance_stats_trigger ON attendance_records;
CREATE TRIGGER attendance_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION trigger_update_attendance_stats();

-- Sample data for testing (optional)
/*
-- Insert sample class schedule (Sunday and Tuesday for a class)
INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time) VALUES
('class_001', 0, '09:00', '11:00'), -- Sunday
('class_001', 2, '09:00', '11:00'); -- Tuesday

-- Generate sessions for the next month
SELECT generate_class_sessions('class_001', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days');
*/