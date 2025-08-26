const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration - update these with your actual database credentials
const pool = new Pool({
  user: process.env.DB_USER || 'mshababalrizahs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hlaqh',
  password: process.env.DB_PASSWORD || 'MM886788648807ooO',
  port: process.env.DB_PORT || 5432,
});

// Migration system
class DatabaseMigrator {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.ensureMigrationsTable();
  }

  // Create migrations tracking table
  async ensureMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(32)
      );
    `;
    await pool.query(query);
  }

  // Get applied migrations
  async getAppliedMigrations() {
    const result = await pool.query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map(row => row.filename);
  }

  // Get pending migrations
  async getPendingMigrations() {
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    return allMigrations.filter(migration => !appliedMigrations.includes(migration));
  }

  // Calculate file checksum
  calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  // Run a single migration
  async runMigration(filename) {
    const filePath = path.join(this.migrationsPath, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const checksum = this.calculateChecksum(content);

    console.log(`Running migration: ${filename}`);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute the migration
      await client.query(content);
      
      // Record the migration
      await client.query(
        'INSERT INTO migrations (filename, checksum) VALUES ($1, $2)',
        [filename, checksum]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${filename} completed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration ${filename} failed:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // Run all pending migrations
  async migrate() {
    console.log('🔄 Checking for pending migrations...');
    
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations found. Database is up to date!');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migration(s):`);
    pendingMigrations.forEach(migration => console.log(`  - ${migration}`));

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }

    console.log('🎉 All migrations completed successfully!');
  }

  // Create a new migration file
  createMigration(name) {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filepath = path.join(this.migrationsPath, filename);
    
    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- 
-- Add your SQL commands below:

-- Example:
-- ALTER TABLE table_name ADD COLUMN new_column VARCHAR(255);
-- UPDATE table_name SET new_column = 'default_value' WHERE condition;

`;

    fs.writeFileSync(filepath, template);
    console.log(`📝 Created new migration: ${filename}`);
    console.log(`📁 Edit the file: ${filepath}`);
    return filename;
  }

  // Show migration status
  async status() {
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = await this.getPendingMigrations();

    console.log('\n📊 Migration Status:');
    console.log(`✅ Applied: ${appliedMigrations.length}`);
    console.log(`⏳ Pending: ${pendingMigrations.length}`);

    if (appliedMigrations.length > 0) {
      console.log('\n✅ Applied Migrations:');
      appliedMigrations.forEach(migration => console.log(`  - ${migration}`));
    }

    if (pendingMigrations.length > 0) {
      console.log('\n⏳ Pending Migrations:');
      pendingMigrations.forEach(migration => console.log(`  - ${migration}`));
    }
  }
}

// CLI Interface
async function main() {
  const migrator = new DatabaseMigrator();
  
  // Ensure migrations directory exists
  if (!fs.existsSync(migrator.migrationsPath)) {
    fs.mkdirSync(migrator.migrationsPath, { recursive: true });
    console.log(`📁 Created migrations directory: ${migrator.migrationsPath}`);
  }

  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'migrate':
      case 'up':
        await migrator.migrate();
        break;
      
      case 'status':
        await migrator.status();
        break;
      
      case 'create':
        if (!arg) {
          console.error('❌ Please provide a migration name: node migrate.js create "add_new_column"');
          process.exit(1);
        }
        migrator.createMigration(arg);
        break;
      
      default:
        console.log(`
🗃️  Database Migration Tool

Usage:
  node migrate.js migrate     - Run all pending migrations
  node migrate.js status      - Show migration status
  node migrate.js create <name> - Create a new migration file

Examples:
  node migrate.js migrate
  node migrate.js status
  node migrate.js create "add grades table updates"
        `);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseMigrator;