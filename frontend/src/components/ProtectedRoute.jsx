import { Navigate } from "react-router-dom";

// Utility: checks if token exists (you can also add expiry checks)
function isAuthenticated() {
  return !!localStorage.getItem("token");
}

// Usage: <ProtectedRoute><SomeComponent /></ProtectedRoute>
export default function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
