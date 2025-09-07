import { useEffect, useState } from "react";
import Layout from "./Layout";

const ConditionalLayout = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // Determine if user should see the sidebar
  const shouldShowSidebar = () => {
    if (!user || !user.role) return true; // Default to showing sidebar
    return !['student', 'teacher', 'parent'].includes(user.role);
  };

  // If user should have sidebar, wrap with Layout
  if (shouldShowSidebar()) {
    return <Layout>{children}</Layout>;
  }

  // Otherwise, render children directly (no sidebar)
  return children;
};

export default ConditionalLayout;