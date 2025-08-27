import { useState, useEffect } from "react";
import NavigationSidebar from "./NavigationSidebar";
import { AiOutlineMenu, AiOutlineClose } from "react-icons/ai";

const Layout = ({ children }) => {
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

  return (
    <div className="min-h-screen" dir="rtl">
      <NavigationSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Mobile menu button - Always visible on mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl shadow-xl transition-all duration-200 flex items-center justify-center"
        style={{ width: '48px', height: '48px' }}
      >
        {sidebarOpen ? (
          <AiOutlineClose className="text-xl" />
        ) : (
          <AiOutlineMenu className="text-xl" />
        )}
      </button>
      
      <main className={`
        min-h-screen transition-all duration-300
        ${sidebarOpen ? 'lg:mr-72' : 'lg:mr-20'}
        pt-16 lg:pt-0
      `}>
        {/* Main content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;