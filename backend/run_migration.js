// Migration script to add new user types tables
const db = require('./db');

async function runMigration() {
  const client = await db.connect();
  
  try {
    console.log('Starting migration to add new user types...');
    
    await client.query('BEGIN');
    
    // Create administrators table
    console.log('Creating administrators table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS administrators (
          id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'administrator',
          hire_date DATE DEFAULT CURRENT_DATE,
          salary DECIMAL(10,2),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
          qualifications TEXT,
          permissions TEXT
      )
    `);
    
    // Create admins table
    console.log('Creating admins table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
          id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'admin',
          hire_date DATE DEFAULT CURRENT_DATE,
          salary DECIMAL(10,2),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
          qualifications TEXT,
          permissions TEXT,
          created_by VARCHAR(10) REFERENCES users(id)
      )
    `);
    
    // Create supervisors table
    console.log('Creating supervisors table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS supervisors (
          id VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'supervisor',
          hire_date DATE DEFAULT CURRENT_DATE,
          salary DECIMAL(10,2),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
          qualifications TEXT,
          permissions TEXT,
          supervised_areas TEXT
      )
    `);
    
    // Create indexes
    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_administrators_status ON administrators(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_supervisors_status ON supervisors(status)');
    
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    console.log('New tables created: administrators, admins, supervisors');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.log('\nIf tables already exist, this error is normal.');
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();