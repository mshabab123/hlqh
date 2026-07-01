import { useState, useEffect } from "react";
import NavigationSidebar from "./NavigationSidebar";
import { AiOutlineClose, AiOutlineMenu } from "react-icons/ai";

const Layout = ({ children, fitViewport = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <NavigationSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Mobile menu button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 right-4 z-[70] p-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl shadow-xl transition-all duration-200 flex items-center justify-center"
          style={{ width: '48px', height: '48px' }}
          aria-label="Open navigation menu"
        >
          <AiOutlineMenu className="text-xl" />
        </button>
      )}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed top-24 right-4 z-[200] p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xl transition-all duration-200 flex items-center justify-center"
          style={{ width: '48px', height: '48px' }}
          aria-label="Close navigation menu"
        >
          <AiOutlineClose className="text-xl" />
        </button>
      )}
      
      <main className={`
        transition-all duration-300
        ${fitViewport ? 'h-full overflow-hidden' : 'min-h-screen'}
        ${sidebarOpen ? 'lg:mr-72' : 'lg:mr-20'}
        pt-16 lg:pt-0
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
