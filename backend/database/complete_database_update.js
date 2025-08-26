const { Pool } = require('pg');

// Database configuration - update these with your actual database credentials
const pool = new Pool({
  user: process.env.DB_USER || 'mshababalrizahs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hlaqh',
  password: process.env.DB_PASSWORD || 'MM886788648807ooO',
  port: process.env.DB_PORT || 5432,
});

class CompleteDatabaseUpdater {
  constructor() {
    this.updates = [];
  }

  // Check if a column exists in a table
  async columnExists(client, tableName, columnName) {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      );
    `, [tableName, columnName]);
    return result.rows[0].exists;
  }

  // Check if an index exists
  async indexExists(client, indexName) {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = $1
      );
    `, [indexName]);
    return result.rows[0].exists;
  }

  // Check if a function exists
  async functionExists(client, functionName) {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = $1
      );
    `, [functionName]);
    return result.rows[0].exists;
  }

  // Check if a view exists
  async viewExists(client, viewName) {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = $1
      );
    `, [viewName]);
    return result.rows[0].exists;
  }

  // Update 1: Add user activation system
  async updateUserActivationSystem(client) {
    console.log('📝 Checking User Activation System...');
    
    const hasIsActive = await this.columnExists(client, 'users', 'is_active');
    
    if (!hasIsActive) {
      console.log('   ➕ Adding is_active column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN is_active BOOLEAN DEFAULT false;
      `);
      this.updates.push('Added is_active column to users table');
    } else {
      console.log('   ✅ is_active column already exists');
    }

    // Set existing users as active if they don't have a value
    const updateResult = await client.query(`
      UPDATE users 
      SET is_active = true 
      WHERE is_active IS NULL;
    `);
    
    if (updateResult.rowCount > 0) {
      console.log(`   ➕ Updated ${updateResult.rowCount} users to active status`);
      this.updates.push(`Set ${updateResult.rowCount} existing users as active`);
    }

    // Make column NOT NULL if it isn't already
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN is_active SET NOT NULL;
    `);

    // Add index if it doesn't exist
    const hasIndex = await this.indexExists(client, 'idx_users_is_active');
    if (!hasIndex) {
      console.log('   ➕ Creating index for is_active column...');
      await client.query(`
        CREATE INDEX idx_users_is_active ON users(is_active);
      `);
      this.updates.push('Added index for is_active column');
    } else {
      console.log('   ✅ is_active index already exists');
    }
  }

  // Update 2: Add admin helper functions
  async updateAdminFunctions(client) {
    console.log('📝 Checking Admin Helper Functions...');

    // Create activate_user function
    const hasActivateFunction = await this.functionExists(client, 'activate_user');
    if (!hasActivateFunction) {
      console.log('   ➕ Creating activate_user function...');
      await client.query(`
        CREATE OR REPLACE FUNCTION activate_user(user_email_param VARCHAR)
        RETURNS BOOLEAN AS $$
        BEGIN
            UPDATE users 
            SET is_active = true, 
                updated_at = NOW()
            WHERE email = user_email_param;
            
            RETURN FOUND;
        END;
        $$ LANGUAGE plpgsql;
      `);
      this.updates.push('Created activate_user function');
    } else {
      console.log('   ✅ activate_user function already exists');
    }

    // Create deactivate_user function
    const hasDeactivateFunction = await this.functionExists(client, 'deactivate_user');
    if (!hasDeactivateFunction) {
      console.log('   ➕ Creating deactivate_user function...');
      await client.query(`
        CREATE OR REPLACE FUNCTION deactivate_user(user_email_param VARCHAR)
        RETURNS BOOLEAN AS $$
        BEGIN
            UPDATE users 
            SET is_active = false, 
                updated_at = NOW()
            WHERE email = user_email_param;
            
            RETURN FOUND;
        END;
        $$ LANGUAGE plpgsql;
      `);
      this.updates.push('Created deactivate_user function');
    } else {
      console.log('   ✅ deactivate_user function already exists');
    }
  }

  // Update 3: Create admin views
  async updateAdminViews(client) {
    console.log('📝 Checking Admin Views...');

    // Always recreate view to ensure it's up to date
    console.log('   ➕ Creating/updating user_activation_status view...');
    await client.query(`
      CREATE OR REPLACE VIEW user_activation_status AS
      SELECT 
          id,
          first_name,
          last_name, 
          email,
          role,
          is_active,
          created_at,
          updated_at,
          CASE 
              WHEN is_active = true THEN 'مفعل'
              ELSE 'غير مفعل'
          END as status_arabic
      FROM users
      ORDER BY created_at DESC;
    `);
    this.updates.push('Created/updated user_activation_status view');
  }

  // Update 4: Ensure required tables exist with proper structure
  async updateTableStructures(client) {
    console.log('📝 Checking Table Structures...');

    // Check if users table has required columns
    const requiredColumns = [
      { name: 'id', type: 'UUID' },
      { name: 'first_name', type: 'VARCHAR' },
      { name: 'last_name', type: 'VARCHAR' },
      { name: 'email', type: 'VARCHAR' },
      { name: 'role', type: 'VARCHAR' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' }
    ];

    for (const column of requiredColumns) {
      const exists = await this.columnExists(client, 'users', column.name);
      if (!exists) {
        console.log(`   ⚠️  WARNING: Required column '${column.name}' missing from users table`);
      }
    }

    // Add updated_at column if it doesn't exist
    const hasUpdatedAt = await this.columnExists(client, 'users', 'updated_at');
    if (!hasUpdatedAt) {
      console.log('   ➕ Adding updated_at column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
      `);
      this.updates.push('Added updated_at column to users table');
    } else {
      console.log('   ✅ updated_at column exists');
    }
  }

  // Update 5: Fix any data inconsistencies
  async fixDataInconsistencies(client) {
    console.log('📝 Checking Data Consistency...');

    // Ensure all users have proper role values
    const roleUpdateResult = await client.query(`
      UPDATE users 
      SET role = 'parent' 
      WHERE role IS NULL OR role = '';
    `);
    
    if (roleUpdateResult.rowCount > 0) {
      console.log(`   ➕ Fixed ${roleUpdateResult.rowCount} users with missing roles`);
      this.updates.push(`Fixed ${roleUpdateResult.rowCount} users with missing roles`);
    }

    // Ensure all users have updated_at values
    const updatedAtResult = await client.query(`
      UPDATE users 
      SET updated_at = created_at 
      WHERE updated_at IS NULL;
    `);
    
    if (updatedAtResult.rowCount > 0) {
      console.log(`   ➕ Fixed ${updatedAtResult.rowCount} users with missing updated_at`);
      this.updates.push(`Fixed ${updatedAtResult.rowCount} users with missing updated_at`);
    }
  }

  // Main update function
  async runCompleteUpdate() {
    console.log('🚀 Starting Complete Database Update...');
    console.log('========================================\n');
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Run all updates
      await this.updateTableStructures(client);
      await this.updateUserActivationSystem(client);
      await this.updateAdminFunctions(client);
      await this.updateAdminViews(client);
      await this.fixDataInconsistencies(client);

      // Get final statistics
      console.log('\n📝 Getting final database statistics...');
      const statsResult = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
          COUNT(DISTINCT role) as total_roles
        FROM users;
      `);

      const stats = statsResult.rows[0];

      await client.query('COMMIT');

      // Show completion summary
      console.log('\n🎉 Complete Database Update Finished!');
      console.log('=====================================');
      
      if (this.updates.length > 0) {
        console.log('\n📋 Updates Applied:');
        this.updates.forEach((update, index) => {
          console.log(`   ${index + 1}. ${update}`);
        });
      } else {
        console.log('\n✅ Database was already up to date - no changes needed');
      }

      console.log('\n📊 Final Database Statistics:');
      console.log(`   Total users: ${stats.total_users}`);
      console.log(`   Active users: ${stats.active_users}`);
      console.log(`   Inactive users: ${stats.inactive_users}`);
      console.log(`   Different roles: ${stats.total_roles}`);

      console.log('\n📚 Available Admin Commands:');
      console.log('   View all users: SELECT * FROM user_activation_status;');
      console.log('   Activate user: SELECT activate_user(\'email@example.com\');');
      console.log('   Deactivate user: SELECT deactivate_user(\'email@example.com\');');
      console.log('   Count by status: SELECT is_active, COUNT(*) FROM users GROUP BY is_active;');
      
      console.log('\n✨ Your inactive user popup system is now ready!');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Update failed:', error.message);
      console.error('💡 Error details:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Main execution
async function main() {
  const updater = new CompleteDatabaseUpdater();
  
  try {
    await updater.runCompleteUpdate();
  } catch (error) {
    console.error('💥 Complete database update failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
    console.log('👋 Update complete - you can now test your inactive user system!');
    process.exit(0);
  }
}

// Handle script execution
if (require.main === module) {
  main();
}

module.exports = CompleteDatabaseUpdater;