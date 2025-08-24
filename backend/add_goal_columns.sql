-- Add goal columns to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS goal_surah VARCHAR(100),
ADD COLUMN IF NOT EXISTS goal_start_verse INTEGER,
ADD COLUMN IF NOT EXISTS goal_end_verse INTEGER,
ADD COLUMN IF NOT EXISTS goal_set_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS goal_target_date DATE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_students_goal ON students(goal_surah, goal_start_verse, goal_end_verse);