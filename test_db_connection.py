import os
import mysql.connector
from mysql.connector import Error

def test_database_connection():
    print('🔍 Testing MySQL database connection...')
    
    try:
        # Database configuration
        config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'your_database'),
            'port': int(os.getenv('DB_PORT', 3306))
        }
        
        print('🔧 Current database configuration:')
        print(f"Host: {config['host']}")
        print(f"User: {config['user']}")
        print(f"Database: {config['database']}")
        print(f"Port: {config['port']}")
        print(f"Password: {'***hidden***' if config['password'] else 'not set'}")
        print('---')
        
        # Create connection
        connection = mysql.connector.connect(**config)
        
        if connection.is_connected():
            print('✅ Database connection established successfully!')
            
            cursor = connection.cursor()
            
            # Test query
            cursor.execute('SELECT 1 + 1 AS result')
            result = cursor.fetchone()
            print(f'📊 Test query result: {result[0]}')
            
            # Database info
            cursor.execute('SELECT DATABASE() as current_db, VERSION() as version')
            db_info = cursor.fetchone()
            print(f'📋 Current database: {db_info[0]}')
            print(f'📋 MySQL version: {db_info[1]}')
            
            # Show tables
            cursor.execute('SHOW TABLES')
            tables = cursor.fetchall()
            table_names = [table[0] for table in tables]
            print(f'📂 Available tables: {table_names}')
            
    except Error as e:
        print('❌ Database connection failed:')
        print(f'Error code: {e.errno}')
        print(f'Error message: {e.msg}')
        
        # Common error solutions
        if e.errno == 2003:
            print('💡 Solution: Check if MySQL server is running')
        elif e.errno == 1045:
            print('💡 Solution: Check username/password credentials')
        elif e.errno == 1049:
            print('💡 Solution: Check if database name exists')
        elif e.errno == 2005:
            print('💡 Solution: Check host address')
            
    except Exception as e:
        print(f'❌ Unexpected error: {e}')
        
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print('🔒 Connection closed successfully')

if __name__ == "__main__":
    test_database_connection()