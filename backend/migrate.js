// Migration script to transition from old schema to new schema
const db = require('./db');
const fs = require('fs');
const path = require('path');

class DatabaseMigrator {
  constructor() {
    this.client = null;
  }

  async connect() {
    this.client = await db.connect();
    console.log('🔌 Connected to database for migration');
  }

  async disconnect() {
    if (this.client) {
      this.client.release();
      console.log('✅ Migration completed, database connection closed');
    }
  }

  async backupExistingData() {
    console.log('📦 Creating backup of existing data...');
    try {
      // Check if users table exists
      const tableCheck = await this.client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      `);

      if (tableCheck.rows.length > 0) {
        // Export existing users data
        const existingUsers = await this.client.query('SELECT * FROM users');
        
        const backupData = {
          backup_date: new Date().toISOString(),
          users: existingUsers.rows
        };

        const backupPath = path.join(__dirname, `backup_${Date.now()}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        console.log(`✅ Backup created: ${backupPath}`);
        console.log(`📊 Backed up ${existingUsers.rows.length} users`);
        
        return backupData;
      } else {
        console.log('ℹ️  No existing users table found, skipping backup');
        return null;
      }
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  async createNewSchema() {
    console.log('🏗️  Creating new database schema...');
    try {
      // Read and execute schema.sql
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = schemaSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

      for (const statement of statements) {
        try {
          if (statement.includes('CREATE EXTENSION')) {
            // Handle extensions separately (might already exist)
            try {
              await this.client.query(statement);
            } catch (extErr) {
              if (!extErr.message.includes('already exists')) {
                throw extErr;
              }
            }
          } else if (statement.includes('CREATE TABLE')) {
            // Handle table creation with IF NOT EXISTS
            const modifiedStatement = statement.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS');
            await this.client.query(modifiedStatement);
          } else {
            await this.client.query(statement);
          }
        } catch (stmtError) {
          if (!stmtError.message.includes('already exists')) {
            console.warn(`⚠️  Warning executing statement: ${stmtError.message}`);
          }
        }
      }

      console.log('✅ New schema created successfully');
    } catch (error) {
      console.error('❌ Schema creation failed:', error.message);
      throw error;
    }
  }

  async migrateExistingData(backupData) {
    if (!backupData || !backupData.users.length) {
      console.log('ℹ️  No existing data to migrate');
      return;
    }

    console.log('🔄 Migrating existing user data...');
    
    try {
      await this.client.query('BEGIN');

      for (const user of backupData.users) {
        try {
          // Determine if user is parent or student based on role or data
          const isParent = user.role === 'Parent' || user.parentid === null;
          const isStudent = user.role === 'Student' || user.parentid !== null;

          // Insert into users table (base data)
          await this.client.query(`
            INSERT INTO users (
              id, first_name, second_name, third_name, last_name, 
              email, phone, password, address, date_of_birth, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
              first_name = EXCLUDED.first_name,
              second_name = EXCLUDED.second_name,
              third_name = EXCLUDED.third_name,
              last_name = EXCLUDED.last_name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              address = EXCLUDED.address,
              date_of_birth = EXCLUDED.date_of_birth
          `, [
            user.id,
            user.first_name,
            user.second_name,
            user.third_name,
            user.last_name,
            user.email,
            user.phone,
            user.password, // Already hashed
            user.address,
            user.date_of_birth,
            user.created_at || new Date()
          ]);

          // Insert into appropriate specialized table
          if (isParent) {
            await this.client.query(`
              INSERT INTO parents (id, neighborhood, is_also_student, student_school_level)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (id) DO NOTHING
            `, [
              user.id,
              user.address || 'غير محدد',
              user.role === 'Student',
              user.school_level
            ]);

            // If parent is also student, add to students table
            if (user.role === 'Student' && user.school_level) {
              await this.client.query(`
                INSERT INTO students (id, school_level, parent_id)
                VALUES ($1, $2, $1)
                ON CONFLICT (id) DO NOTHING
              `, [user.id, user.school_level]);
            }
          }

          if (isStudent && user.parentid) {
            await this.client.query(`
              INSERT INTO students (id, school_level, parent_id)
              VALUES ($1, $2, $3)
              ON CONFLICT (id) DO NOTHING
            `, [user.id, user.school_level, user.parentid]);

            // Create parent-student relationship
            await this.client.query(`
              INSERT INTO parent_student_relationships (parent_id, student_id, is_primary)
              VALUES ($1, $2, true)
              ON CONFLICT (parent_id, student_id) DO NOTHING
            `, [user.parentid, user.id]);
          }

          console.log(`✅ Migrated user: ${user.first_name} ${user.last_name} (${user.id})`);
        } catch (userError) {
          console.error(`❌ Failed to migrate user ${user.id}:`, userError.message);
        }
      }

      await this.client.query('COMMIT');
      console.log(`✅ Successfully migrated ${backupData.users.length} users`);
    } catch (error) {
      await this.client.query('ROLLBACK');
      console.error('❌ Data migration failed:', error.message);
      throw error;
    }
  }

  async verifyMigration() {
    console.log('🔍 Verifying migration...');
    
    try {
      const userCount = await this.client.query('SELECT COUNT(*) FROM users');
      const parentCount = await this.client.query('SELECT COUNT(*) FROM parents');
      const studentCount = await this.client.query('SELECT COUNT(*) FROM students');
      const relationshipCount = await this.client.query('SELECT COUNT(*) FROM parent_student_relationships');

      console.log('📊 Migration Summary:');
      console.log(`   Users: ${userCount.rows[0].count}`);
      console.log(`   Parents: ${parentCount.rows[0].count}`);
      console.log(`   Students: ${studentCount.rows[0].count}`);
      console.log(`   Parent-Student Relationships: ${relationshipCount.rows[0].count}`);
      
      // Check for orphaned records
      const orphanedStudents = await this.client.query(`
        SELECT COUNT(*) FROM students s
        LEFT JOIN users u ON s.id = u.id
        WHERE u.id IS NULL
      `);

      if (parseInt(orphanedStudents.rows[0].count) > 0) {
        console.warn(`⚠️  Found ${orphanedStudents.rows[0].count} orphaned student records`);
      }

      console.log('✅ Migration verification completed');
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
    }
  }

  async run() {
    try {
      console.log('🚀 Starting database migration...\n');
      
      await this.connect();
      
      // Step 1: Backup existing data
      const backupData = await this.backupExistingData();
      
      // Step 2: Create new schema
      await this.createNewSchema();
      
      // Step 3: Migrate existing data
      await this.migrateExistingData(backupData);
      
      // Step 4: Verify migration
      await this.verifyMigration();
      
      console.log('\n✅ Database migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Update your app.js to include new routes');
      console.log('   2. Test the new API endpoints');
      console.log('   3. Update your frontend to use new endpoints');
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      console.error('Please check the error and try again.');
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  migrator.run().catch(error => {
    console.error('Migration script error:', error);
    process.exit(1);
  });
}

module.exports = DatabaseMigrator;