const { Pool } = require('pg');

// Database configuration - update these with your actual database credentials
const pool = new Pool({
  user: process.env.DB_USER || 'mshababalrizahs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hlaqh',
  password: process.env.DB_PASSWORD || 'MM886788648807ooO',
  port: process.env.DB_PORT || 5432,
});

async function updateUserActivationSystem() {
  console.log('🔄 Starting user activation system update...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('📝 Step 1: Adding is_active column to users table...');
    
    // Add is_active column to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
    `);
    console.log('✅ is_active column added successfully');
    
    console.log('📝 Step 2: Setting existing users as active...');
    
    // Set existing users as active (so current users don't get locked out)
    const updateResult = await client.query(`
      UPDATE users 
      SET is_active = true 
      WHERE is_active IS NULL;
    `);
    console.log(`✅ Updated ${updateResult.rowCount} existing users to active status`);
    
    console.log('📝 Step 3: Making is_active column NOT NULL...');
    
    // Make column NOT NULL after setting defaults
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN is_active SET NOT NULL;
    `);
    console.log('✅ is_active column set to NOT NULL');
    
    console.log('📝 Step 4: Adding database index...');
    
    // Add index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
    `);
    console.log('✅ Database index created');
    
    console.log('📝 Step 5: Creating admin helper functions...');
    
    // Create function to activate users
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
    
    // Create function to deactivate users
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
    console.log('✅ Admin helper functions created');
    
    console.log('📝 Step 6: Creating user activation status view...');
    
    // Create view for admin to see user activation status
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
    console.log('✅ User activation status view created');
    
    console.log('📝 Step 7: Getting final statistics...');
    
    // Get final statistics
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users
      FROM users;
    `);
    
    const stats = statsResult.rows[0];
    
    await client.query('COMMIT');
    
    console.log('\n🎉 User activation system update completed successfully!');
    console.log('📊 Statistics:');
    console.log(`   Total users: ${stats.total_users}`);
    console.log(`   Active users: ${stats.active_users}`);
    console.log(`   Inactive users: ${stats.inactive_users}`);
    console.log('\n📚 Admin Commands:');
    console.log('   View all users: SELECT * FROM user_activation_status;');
    console.log('   Activate user: SELECT activate_user(\'email@example.com\');');
    console.log('   Deactivate user: SELECT deactivate_user(\'email@example.com\');');
    console.log('\n✨ The inactive user popup system is now ready to use!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Update failed:', error.message);
    console.error('📝 Details:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the update
async function main() {
  try {
    await updateUserActivationSystem();
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Handle script execution
if (require.main === module) {
  console.log('🚀 User Activation System Database Update');
  console.log('==========================================');
  main();
}

module.exports = { updateUserActivationSystem };