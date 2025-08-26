-- Migration: add_is_pending_to_parent_student_relationships
-- Created: 2025-08-26T11:52:20.848Z
-- 
-- Add is_pending column to parent_student_relationships table to track pending relationships

-- Add is_pending column with default value of false
ALTER TABLE parent_student_relationships 
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN NOT NULL DEFAULT false;

-- Update existing relationships to be non-pending
UPDATE parent_student_relationships 
SET is_pending = false 
WHERE is_pending IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN parent_student_relationships.is_pending IS 'True if relationship is pending (one party has not registered yet)';

