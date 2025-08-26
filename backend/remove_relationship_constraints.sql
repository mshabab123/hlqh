-- Remove foreign key constraints from parent_student_relationships table
-- This allows us to store relationships even when parent or student don't exist yet

-- Drop the foreign key constraints
ALTER TABLE parent_student_relationships 
DROP CONSTRAINT IF EXISTS parent_student_relationships_parent_id_fkey;

ALTER TABLE parent_student_relationships 
DROP CONSTRAINT IF EXISTS parent_student_relationships_student_id_fkey;

-- Verify constraints have been removed
SELECT conname, conrelid::regclass 
FROM pg_constraint 
WHERE conrelid = 'parent_student_relationships'::regclass 
AND contype = 'f';

-- Add comment explaining why constraints were removed
COMMENT ON TABLE parent_student_relationships IS 'Stores parent-student relationships. Foreign key constraints removed to allow pending relationships where one party has not registered yet.';