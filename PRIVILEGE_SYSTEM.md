# Integrated Privilege Management System

Your application now has **TWO privilege systems working together**:

## 1. Role-Based Access Control (RBAC) - Foundation System
- **Purpose**: Basic access control based on user roles
- **Roles**: admin, administrator, supervisor, teacher, parent, student
- **Location**: Used throughout the app for basic access control
- **Implementation**: Static role checking in components and routes

## 2. Custom Privileges System - Enhancement Layer
- **Purpose**: Granular permission control that can override or enhance role-based access
- **Database**: `user_privileges` table with JSONB permissions
- **Categories**: System, Schools, Users, Academic, Attendance, Reports
- **Management**: Admin-only access via `/privilege-management` page

## How They Work Together

### Priority Order:
1. **Custom Privileges** (if defined) - Override role-based permissions
2. **Role-Based Permissions** (fallback) - Default permissions based on user role

### Integration Points:

#### ProtectedRoute Component
- First checks role-based access for quick approval
- If role-based access is denied, checks custom privileges
- Shows loading screen while checking privileges
- Backward compatible with existing route protection

#### NavigationSidebar Component  
- Dynamically shows/hides navigation items based on combined privileges
- Async privilege checking with caching for performance
- Falls back to role-based access if privilege system fails

#### Privilege Utilities (`/src/utils/privilegeUtils.js`)
- `hasPermission(user, category, action)` - Check specific permissions
- `hasRouteAccess(user, routePath)` - Check route access
- `canAccessNavItem(user, roles, path)` - Navigation item access
- Caching system for performance (5-minute cache)

## Example Scenarios:

### Scenario 1: Default Access
- User: Teacher with default role permissions
- Result: Can access academic and attendance features as per role

### Scenario 2: Enhanced Access  
- User: Teacher role + custom privilege "users.manage = true"
- Result: Can access academic features + user management (normally admin-only)

### Scenario 3: Restricted Access
- User: Administrator role + custom privilege "schools.view = false" 
- Result: Cannot view schools despite being an administrator

## Permission Structure:

```json
{
  "system": { "view": true, "manage": false },
  "schools": { "all": true },
  "users": { "view": true, "create": true, "edit": false, "delete": false },
  "academic": { "view": true, "edit": true },
  "attendance": { "all": true },
  "reports": { "view": true, "create": false }
}
```

## Usage:

### For Administrators:
1. Go to `/privilege-management` or via Admin Control Panel
2. Select a user to modify their privileges  
3. Choose specific permissions to grant or deny
4. Changes take effect immediately (cached for 5 minutes)

### For Developers:
```javascript
import { hasPermission, hasRouteAccess } from './utils/privilegeUtils';

// Check specific permission
const canManageUsers = await hasPermission(user, 'users', 'manage');

// Check route access  
const canAccessRoute = await hasRouteAccess(user, '/user-management');
```

## Benefits:

✅ **Backward Compatibility**: Existing role-based system continues working  
✅ **Granular Control**: Fine-tune permissions per user  
✅ **Performance**: Intelligent caching and fallback mechanisms  
✅ **Flexibility**: Override any default role permission  
✅ **Security**: Admin-only access to privilege management  

## Technical Details:

- **Database**: PostgreSQL with JSONB for flexible permission storage
- **API**: RESTful endpoints for privilege management  
- **Frontend**: React with async privilege checking
- **Caching**: In-memory cache with automatic expiry
- **Integration**: Seamless with existing authentication system

The system is fully integrated and ready for production use!