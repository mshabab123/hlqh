import { Navigate } from "react-router-dom";

// Utility: checks if token exists
function isAuthenticated() {
  return !!localStorage.getItem("token");
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
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  if (!hasRequiredRole(requiredRole)) {
    return <Navigate to="/home" replace />;
  }
  
  return children;
}
