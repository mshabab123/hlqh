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
    <div className="min-h-screen flex" dir="rtl">
      <NavigationSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <main className={`
        flex-1 transition-all duration-300 min-h-screen
        ${sidebarOpen ? 'lg:mr-72' : 'lg:mr-20'}
        bg-gray-50
      `}>
        {/* Mobile menu button - Always visible on mobile */}
        <div className="lg:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="fixed top-4 right-4 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xl transition-all duration-200 flex items-center justify-center"
            style={{ width: '48px', height: '48px' }}
          >
            {sidebarOpen ? (
              <AiOutlineClose className="text-xl" />
            ) : (
              <AiOutlineMenu className="text-xl" />
            )}
          </button>
          
          {/* Mobile header space */}
          <div className="h-20"></div>
        </div>
        
        {/* Main content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;