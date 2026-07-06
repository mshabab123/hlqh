import { useState, useEffect } from "react";
import NavigationSidebar from "./NavigationSidebar";
import { AiOutlineMenu } from "react-icons/ai";

const Layout = ({ children, fitViewport = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-open sidebar on desktop, close on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const syncSidebarClass = () => {
      document.body.classList.toggle(
        'mobile-sidebar-open',
        sidebarOpen && window.innerWidth < 1024
      );
    };

    syncSidebarClass();
    window.addEventListener('resize', syncSidebarClass);

    return () => {
      window.removeEventListener('resize', syncSidebarClass);
      document.body.classList.remove('mobile-sidebar-open');
    };
  }, [sidebarOpen]);

  return (
    <div className={fitViewport ? "h-[calc(100vh-5rem)] overflow-hidden" : "min-h-screen"} dir="rtl">
      <NavigationSidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />
      
      {/* Mobile menu button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-24 right-4 z-[130] p-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl shadow-xl transition-all duration-200 flex items-center justify-center"
          style={{ width: '48px', height: '48px' }}
          aria-label="Open navigation menu"
        >
          <AiOutlineMenu className="text-xl" />
        </button>
      )}
      
      <main className={`
        transition-all duration-300
        ${fitViewport ? 'h-full overflow-hidden' : 'min-h-screen'}
        ${sidebarCollapsed ? 'lg:mr-20' : 'lg:mr-72'}
      `}>
        {/* Main content */}
        <div className={fitViewport ? "h-full p-3 lg:p-4 overflow-hidden" : "p-4 lg:p-6"}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
