-- Fix teacher status to allow them to access the system
-- The auth middleware requires status = 'active' for teachers to login

-- Update all existing teachers to have active status
UPDATE teachers 
SET status = 'active' 
WHERE status = 'inactive' OR status IS NULL;

-- Also update administrators and supervisors if they have the same issue
UPDATE administrators 
SET status = 'active' 
WHERE status = 'inactive' OR status IS NULL;

UPDATE supervisors 
SET status = 'active' 
WHERE status = 'inactive' OR status IS NULL;

-- Show results
SELECT 'Teachers' as role_type, status, COUNT(*) as count 
FROM teachers 
GROUP BY status
UNION ALL
SELECT 'Administrators', status, COUNT(*) 
FROM administrators 
GROUP BY status
UNION ALL
SELECT 'Supervisors', status, COUNT(*) 
FROM supervisors 
GROUP BY status;