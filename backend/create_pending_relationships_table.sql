-- Create a separate table for pending relationships to avoid foreign key constraint violations

CREATE TABLE IF NOT EXISTS pending_relationships (
    id SERIAL PRIMARY KEY,
    parent_id VARCHAR(10) NOT NULL,
    student_id VARCHAR(10) NOT NULL,
    relationship_type VARCHAR(20) DEFAULT 'parent',
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_relationships_parent_id ON pending_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_pending_relationships_student_id ON pending_relationships(student_id);

-- Add comment
COMMENT ON TABLE pending_relationships IS 'Temporary storage for parent-student relationships when one party has not registered yet';