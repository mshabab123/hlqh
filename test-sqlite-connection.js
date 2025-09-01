const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function testSQLiteConnection() {
  console.log('🔍 Testing SQLite connection...');
  
  const dbPath = process.env.DB_PATH || './database.sqlite';
  console.log('📁 Database file:', path.resolve(dbPath));
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ SQLite connection failed:');
      console.error(err.message);
      return;
    }
    
    console.log('✅ SQLite connection established successfully!');
    
    // Test query
    db.get('SELECT datetime("now") as current_time, sqlite_version() as version', (err, row) => {
      if (err) {
        console.error('❌ Test query failed:', err.message);
      } else {
        console.log('📊 Test query result:', row);
      }
      
      // Show tables
      db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, rows) => {
        if (err) {
          console.error('❌ Failed to get tables:', err.message);
        } else {
          console.log('📂 Available tables:', rows.map(row => row.name));
        }
        
        // Close connection
        db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message);
          } else {
            console.log('🔒 Connection closed successfully');
          }
        });
      });
    });
  });
}

testSQLiteConnection();