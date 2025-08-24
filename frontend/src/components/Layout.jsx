import { useLocation } from "react-router-dom";

const Layout = ({ children }) => {
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem("token");
  const noSidebarRoutes = ["/Login", "/", "/registration", "/parent-registration", "/student-registration", "/TeacherRegister", "/about"];
  const showSidebar = isLoggedIn && !noSidebarRoutes.includes(location.pathname);

  return (
    <div className={`min-h-screen transition-all duration-300 ${showSidebar ? 'pr-16 lg:pr-72' : ''}`}>
      <main className="p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;