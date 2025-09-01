import { Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { hasRouteAccess, canAccessNavItem } from "../utils/privilegeUtils";

// Utility: checks if token exists
function isAuthenticated() {
  return !!localStorage.getItem("token");
}

// Utility: checks if user is active
function isUserActive() {
  const userData = localStorage.getItem("user");
  if (!userData) return false;
  
  const user = JSON.parse(userData);
  return user.is_active !== false; // Default to true if undefined
}

// Utility: checks if user has required role (legacy support)
function hasRequiredRole(requiredRole) {
  if (!requiredRole) return true; // No role requirement
  
  const userData = localStorage.getItem("user");
  if (!userData) return false;
  
  const user = JSON.parse(userData);
  const userRole = user.role || user.user_type;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  
  return userRole === requiredRole;
}

// Enhanced ProtectedRoute with privilege system integration
export default function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState(null); // null = checking, true/false = result
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const checkAccess = async () => {
      const userData = localStorage.getItem("user");
      if (!userData) {
        setHasAccess(false);
        return;
      }
      
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // First check basic role-based access (for backward compatibility)
      const basicAccess = hasRequiredRole(requiredRole);
      
      // If basic access is granted, allow immediately
      if (basicAccess) {
        setHasAccess(true);
        return;
      }
      
      // If basic access is denied but we have custom privileges, check those
      if (requiredRole) {
        try {
          const customAccess = await canAccessNavItem(parsedUser, requiredRole, location.pathname);
          setHasAccess(customAccess);
        } catch (error) {
          console.error('Error checking custom privileges:', error);
          setHasAccess(basicAccess); // Fallback to basic role check
        }
      } else {
        setHasAccess(true); // No role requirement
      }
    };
    
    checkAccess();
  }, [requiredRole, location.pathname]);
  
  // Show loading while checking privileges
  if (hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect inactive users to about page (except if they're already on about or profile)
  if (!isUserActive()) {
    const currentPath = location.pathname;
    if (currentPath !== "/about" && currentPath !== "/profile") {
      return <Navigate to="/about" replace />;
    }
  }
  
  if (!hasAccess) {
    return <Navigate to="/home" replace />;
  }
  
  return children;
}
