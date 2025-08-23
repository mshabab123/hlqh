# Database Migration Guide

This guide will help you migrate from the old database schema to the new improved schema that supports separate parent and student registration.

## 📋 Prerequisites

1. **Backup your current database** (highly recommended!)
2. Ensure your PostgreSQL server is running
3. Have your database connection details ready in `.env` file

## 🚀 Migration Steps

### Step 1: Backup Current Database (Manual)
```bash
# Create a full backup of your database
pg_dump -h localhost -U your_username -d your_database_name > backup_before_migration.sql

# Or backup just the data
pg_dump -h localhost -U your_username -d your_database_name --data-only > data_backup.sql
```

### Step 2: Run the Migration Script
```bash
# Navigate to backend directory
cd D:\Workplace\hlqh\backend

# Run the migration
node migrate.js
```

### Step 3: Verify Migration
The migration script will automatically:
- ✅ Backup existing data to a JSON file
- ✅ Create new database schema
- ✅ Migrate existing users to new structure
- ✅ Create parent-student relationships
- ✅ Verify the migration results

### Step 4: Update Your Environment
```bash
# Install any missing dependencies (if needed)
npm install

# Start the server to test
npm run dev
```

## 📊 Schema Changes

### New Tables Created:
- `parents` - Parent-specific information
- `students` - Student-specific information  
- `parent_student_relationships` - Links parents to students
- `teachers` - Teacher information
- `schools` - School/center information
- `classes` - Class/halaqat information
- `student_enrollments` - Student class enrollments
- `attendance` - Attendance tracking
- `notifications` - Notification system
- `user_sessions` - Session management
- `school_levels` - Reference data for school levels

### Enhanced Tables:
- `users` - Base user information (improved structure)

## 🔗 New API Endpoints

### Parent Registration
```http
POST /api/parents
Content-Type: application/json

{
  "id": "1234567890",
  "first_name": "أحمد",
  "second_name": "محمد",
  "third_name": "علي",
  "last_name": "الأحمدي",
  "email": "ahmed@example.com",
  "phone": "0501234567",
  "password": "securepassword",
  "neighborhood": "الرياض - النسيم",
  "childIds": ["1234567891", "1234567892"],
  "registerSelf": false,
  "selfSchoolLevel": ""
}
```

### Student Registration
```http
POST /api/students
Content-Type: application/json

{
  "id": "1234567891",
  "first_name": "فاطمة",
  "second_name": "أحمد",
  "third_name": "محمد",
  "last_name": "الأحمدي",
  "school_level": "grade5",
  "date_of_birth": "2010-05-15",
  "password": "studentpassword",
  "phone": "0501234568",
  "email": "fatima@example.com",
  "parent_id": "1234567890"
}
```

### Other New Endpoints
- `GET /api/parents/:id` - Get parent details
- `GET /api/students/:id` - Get student details
- `GET /api/students` - List students with filters
- `PUT /api/parents/:id/link-child` - Link child to parent
- `DELETE /api/parents/:id/unlink-child/:childId` - Remove parent-child link
- `GET /api/students/:id/attendance` - Get student attendance

## ⚠️ Important Notes

### Breaking Changes:
1. **Authentication Response Changed**: Login now returns more detailed user information including role-specific data
2. **New Role System**: Users can now have multiple roles (parent, student, teacher)
3. **Separate Registration**: Parents and students now register through different endpoints

### Frontend Updates Required:
1. Update registration forms to use new API endpoints:
   - Parent registration: `/api/parents`
   - Student registration: `/api/students`
2. Update login handling to work with new user structure
3. Handle new role-based navigation and permissions

### Database Compatibility:
- The migration script preserves existing data
- Old API endpoints remain available for backward compatibility
- New schema is optimized for better performance and relationships

## 🔍 Testing the Migration

### Test Parent Registration:
```bash
curl -X POST http://localhost:5000/api/parents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1111111111",
    "first_name": "محمد",
    "second_name": "أحمد",
    "third_name": "علي", 
    "last_name": "السعدي",
    "email": "mohammed@test.com",
    "phone": "0501111111",
    "password": "testpass123",
    "neighborhood": "الرياض",
    "childIds": []
  }'
```

### Test Student Registration:
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "id": "2222222222",
    "first_name": "عائشة",
    "second_name": "محمد",
    "third_name": "أحمد",
    "last_name": "السعدي",
    "school_level": "grade3",
    "date_of_birth": "2012-03-10",
    "password": "studentpass123",
    "parent_id": "1111111111"
  }'
```

### Test Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1111111111",
    "password": "testpass123"
  }'
```

## 🆘 Troubleshooting

### Common Issues:

1. **Migration Script Fails**:
   - Check database connection in `.env` file
   - Ensure PostgreSQL service is running
   - Verify database permissions

2. **Data Not Migrated Properly**:
   - Check the generated backup JSON file
   - Verify original data structure matches expected format
   - Run verification queries manually

3. **New API Endpoints Not Working**:
   - Restart the server: `npm run dev`
   - Check that new routes are properly imported in `app.js`
   - Verify database tables exist

4. **Frontend Connection Issues**:
   - Update frontend API endpoints to use new URLs
   - Check CORS settings if accessing from different domain
   - Verify request/response format matches new schema

### Rollback Plan:
If migration fails, you can restore from backup:
```bash
# Drop current database (CAUTION!)
psql -U your_username -d postgres -c "DROP DATABASE your_database_name;"

# Recreate database
psql -U your_username -d postgres -c "CREATE DATABASE your_database_name;"

# Restore from backup
psql -U your_username -d your_database_name < backup_before_migration.sql
```

## 📞 Support

If you encounter issues during migration:
1. Check the migration log output for specific error messages
2. Verify all prerequisites are met
3. Ensure database permissions are correct
4. Check the backup files were created successfully

The migration script creates detailed logs and backups to help troubleshoot any issues.