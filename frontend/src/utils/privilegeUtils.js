import axios from 'axios';

// Cache for user privileges to avoid repeated API calls
let privilegeCache = new Map();
let cacheExpiry = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clear cache when user logs out
export const clearPrivilegeCache = () => {
  privilegeCache.clear();
  cacheExpiry.clear();
};

// Get user privileges from API (with caching)
export const getUserPrivileges = async (userId) => {
  if (!userId) return {};
  
  // Check cache first
  const now = Date.now();
  if (privilegeCache.has(userId) && cacheExpiry.get(userId) > now) {
    return privilegeCache.get(userId);
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/privileges/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const privileges = response.data.permissions || {};
    
    // Cache the result
    privilegeCache.set(userId, privileges);
    cacheExpiry.set(userId, now + CACHE_DURATION);
    
    return privileges;
  } catch (error) {
    console.error('Error fetching user privileges:', error);
    return {};
  }
};

// Default role-based permissions
const rolePermissions = {
  admin: {
    system: { all: true },
    schools: { all: true },
    users: { all: true },
    academic: { all: true },
    attendance: { all: true },
    reports: { all: true }
  },
  administrator: {
    system: { view: true },
    schools: { view: true, edit: true },
    users: { view: true, create: true, edit: true },
    academic: { all: true },
    attendance: { all: true },
    reports: { view: true, create: true }
  },
  supervisor: {
    system: { view: true },
    schools: { view: true },
    users: { view: true, create: true, edit: true },
    academic: { view: true, edit: true },
    attendance: { view: true, edit: true },
    reports: { view: true, create: true }
  },
  teacher: {
    system: { view: false },
    schools: { view: true },
    users: { view: true },
    academic: { view: true, edit: true },
    attendance: { all: true },
    reports: { view: true }
  },
  parent: {
    system: { view: false },
    schools: { view: true },
    users: { view: false },
    academic: { view: true },
    attendance: { view: true },
    reports: { view: true }
  },
  student: {
    system: { view: false },
    schools: { view: true },
    users: { view: false },
    academic: { view: true },
    attendance: { view: true },
    reports: { view: true }
  }
};

// Check if user has a specific permission
export const hasPermission = async (user, category, action = 'view') => {
  if (!user || !user.role) return false;
  
  // Get role-based permissions
  const rolePerms = rolePermissions[user.role] || {};
  const categoryPerms = rolePerms[category] || {};
  
  // Get custom privileges
  const customPrivileges = await getUserPrivileges(user.id);
  const customCategoryPerms = customPrivileges[category] || {};
  
  // Check custom privileges first (they override role-based)
  if (customCategoryPerms.hasOwnProperty(action)) {
    return customCategoryPerms[action];
  }
  
  if (customCategoryPerms.all !== undefined) {
    return customCategoryPerms.all;
  }
  
  // Fall back to role-based permissions
  if (categoryPerms.all !== undefined) {
    return categoryPerms.all;
  }
  
  return categoryPerms[action] || false;
};

// Check if user has access to a route (enhanced version)
export const hasRouteAccess = async (user, routePath) => {
  if (!user || !user.role) return false;
  
  // Route to permission mapping
  const routePermissions = {
    '/schools': { category: 'schools', action: 'view' },
    '/administrators': { category: 'users', action: 'manage' },
    '/admin-roots': { category: 'system', action: 'manage' },
    '/user-management': { category: 'users', action: 'manage' },
    '/privilege-management': { category: 'system', action: 'manage' },
    '/database': { category: 'system', action: 'manage' },
    '/password-management': { category: 'users', action: 'edit' },
    '/classes': { category: 'academic', action: 'view' },
    '/semesters': { category: 'academic', action: 'manage' },
    '/class-courses': { category: 'academic', action: 'manage' },
    '/teachers': { category: 'users', action: 'view' },
    '/students': { category: 'users', action: 'view' },
    '/parents': { category: 'users', action: 'view' },
    '/grading': { category: 'academic', action: 'edit' },
    '/attendance': { category: 'attendance', action: 'manage' },
    '/points-management': { category: 'academic', action: 'edit' },
    '/daily-reports': { category: 'reports', action: 'view' }
  };
  
  const routePermission = routePermissions[routePath];
  
  if (!routePermission) {
    // For routes not in mapping, fall back to role-based access
    return checkRoleAccess(user.role, routePath);
  }
  
  return await hasPermission(user, routePermission.category, routePermission.action);
};

// Original role-based access check (fallback)
const checkRoleAccess = (userRole, routePath) => {
  const roleAccess = {
    admin: [
      '/schools', '/administrators', '/admin-roots', '/user-management', 
      '/privilege-management', '/database', '/password-management',
      '/classes', '/semesters', '/class-courses', '/teachers', '/students', 
      '/parents', '/grading', '/attendance',
      '/points-management', '/daily-reports'
    ],
    administrator: [
      '/classes', '/semesters', '/class-courses', '/password-management',
      '/grading', '/attendance', '/points-management',
      '/daily-reports'
    ],
    supervisor: [
      '/teachers', '/parents', '/students', '/points-management', '/daily-reports'
    ],
    teacher: [
      '/students', '/grading', '/attendance', '/points-management'
    ],
    parent: ['/my-students', '/children'],
    student: ['/student-points']
  };
  
  const allowedRoutes = roleAccess[userRole] || [];
  return allowedRoutes.includes(routePath);
};

// Check if user can access navigation items
export const canAccessNavItem = async (user, requiredRoles, routePath) => {
  // If no specific roles required, allow access
  if (!requiredRoles) return true;
  
  // Check role-based access first
  const hasRoleAccess = Array.isArray(requiredRoles) 
    ? requiredRoles.includes(user?.role)
    : user?.role === requiredRoles;
    
  // If role-based access is denied, check custom privileges
  if (!hasRoleAccess && routePath) {
    return await hasRouteAccess(user, routePath);
  }
  
  return hasRoleAccess;
};

// Utility to refresh user privileges cache
export const refreshUserPrivileges = async (userId) => {
  // Remove from cache to force refresh
  privilegeCache.delete(userId);
  cacheExpiry.delete(userId);
  
  // Fetch fresh data
  return await getUserPrivileges(userId);
};

export default {
  hasPermission,
  hasRouteAccess,
  canAccessNavItem,
  getUserPrivileges,
  refreshUserPrivileges,
  clearPrivilegeCache
};