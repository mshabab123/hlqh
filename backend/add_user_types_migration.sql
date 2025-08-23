-- Migration script to add new user types: administrators, admins, supervisors
-- Run this script to add the new tables to your existing database

-- Create administrators table
CREATE TABLE IF NOT EXISTS administrators (
    id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'administrator',
    hire_date DATE DEFAULT CURRENT_DATE,
    salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    qualifications TEXT,
    permissions TEXT
);

-- Create admins table (highest level)
CREATE TABLE IF NOT EXISTS admins (
    id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin',
    hire_date DATE DEFAULT CURRENT_DATE,
    salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    qualifications TEXT,
    permissions TEXT,
    created_by VARCHAR(10) REFERENCES users(id)
);

-- Create supervisors table
CREATE TABLE IF NOT EXISTS supervisors (
    id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'supervisor',
    hire_date DATE DEFAULT CURRENT_DATE,
    salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    qualifications TEXT,
    permissions TEXT,
    supervised_areas TEXT
);

-- Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_administrators_status ON administrators(status);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);
CREATE INDEX IF NOT EXISTS idx_supervisors_status ON supervisors(status);