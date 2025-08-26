import { Navigate, useLocation } from "react-router-dom";

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

// Utility: checks if user has required role
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

// Usage: <ProtectedRoute requiredRole="admin"><SomeComponent /></ProtectedRoute>
export default function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation();
  
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
  
  if (!hasRequiredRole(requiredRole)) {
    return <Navigate to="/home" replace />;
  }
  
  return children;
}
