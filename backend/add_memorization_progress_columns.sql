-- Add memorization progress tracking columns to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS memorized_surah_id INTEGER,
ADD COLUMN IF NOT EXISTS memorized_ayah_number INTEGER,
ADD COLUMN IF NOT EXISTS target_surah_id INTEGER,
ADD COLUMN IF NOT EXISTS target_ayah_number INTEGER,
ADD COLUMN IF NOT EXISTS last_memorization_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_students_memorization_progress 
ON students(memorized_surah_id, memorized_ayah_number);

-- Add foreign key constraint for memorized_surah_id (optional, but good practice)
-- Note: We'll keep it simple without FK for now since surah IDs are just integers 1-114