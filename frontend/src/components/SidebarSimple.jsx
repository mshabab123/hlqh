import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { performLogout } from "../utils/logout";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load user info from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleLogout = async () => {
    await performLogout();
    navigate("/");
  };

  // Check if user has access to a specific route
  const hasAccess = (requiredRoles, path) => {
    if (!user || !user.role) return false;
    
    // For inactive users, only allow access to about and profile
    if (user.is_active === false) {
      return path === "/about" || path === "/profile";
    }
    
    if (!requiredRoles) return true; // No role requirement
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    return user.role === requiredRoles;
  };

  // Define all menu items with their permissions
  const menuSections = [
    {
      title: "الرئيسية",
      items: [
        {
          title: "حول النظام",
          path: "/about",
          icon: "📋",
          roles: null
        },
        {
          title: "الصفحة الرئيسية",
          path: "/home",
          icon: "🏠",
          roles: null
        },
        {
          title: "لوحة التحكم",
          path: "/dashboard",
          icon: "📊",
          roles: null
        }
      ]
    },
    {
      title: "إدارة النظام",
      items: [
        {
          title: "إدارة مجمعات الحلقات",
          path: "/schools",
          icon: "🏫",
          roles: ["admin"]
        },
        {
          title: "إدارة الحلقات",
          path: "/classes",
          icon: "👥",
          roles: ["admin", "administrator", "teacher"]
        },
        {
          title: "إدارة المعلمين",
          path: "/teachers",
          icon: "👨‍🏫",
          roles: ["admin", "supervisor"]
        },
        {
          title: "إدارة أولياء الأمور",
          path: "/parents",
          icon: "👨‍👩‍👧‍👦",
          roles: ["admin", "supervisor"]
        },
        {
          title: "إدارة المديرين",
          path: "/administrators",
          icon: "👔",
          roles: ["admin"]
        },
        {
          title: "إدارة الطلاب",
          path: "/students",
          icon: "🎓",
          roles: ["admin", "supervisor", "administrator", "teacher"]
        }
      ]
    },
    {
      title: "الفصول الدراسية والدرجات",
      items: [
        {
          title: "إدارة الفصول الدراسية",
          path: "/semesters",
          icon: "📅",
          roles: ["admin", "administrator"]
        },
        {
          title: "درجات الطلاب",
          path: "/grading",
          icon: "📝",
          roles: ["admin", "administrator", "teacher"]
        },
        {
          title: "الحضور والغياب",
          path: "/attendance",
          icon: "📋",
          roles: ["admin", "administrator", "teacher"]
        },
        {
          title: "مقررات الحلقات",
          path: "/class-courses",
          icon: "📚",
          roles: ["admin", "administrator"]
        }
      ]
    },
    // {
    //   title: "التسجيل",
    //   items: [
    //     {
    //       title: "تسجيل المعلمين",
    //       path: "/TeacherRegister",
    //       icon: "➕",
    //       roles: ["admin", "supervisor"]
    //     },
    //     {
    //       title: "تسجيل أولياء الأمور",
    //       path: "/parent-registration",
    //       icon: "👨‍👩‍👧‍👦",
    //       roles: null
    //     },
    //     {
    //       title: "تسجيل الطلاب",
    //       path: "/student-registration",
    //       icon: "🎒",
    //       roles: null
    //     },
    //     {
    //       title: "التسجيل العام",
    //       path: "/registration",
    //       icon: "📝",
    //       roles: null
    //     }
    //   ]
    // },
    {
      title: "الملف الشخصي",
      items: [
        {
          title: "الملف الشخصي",
          path: "/profile",
          icon: "👤",
          roles: null
        },
        {
          title: "الأبناء",
          path: "/children",
          icon: "👨‍👩‍👧‍👦",
          roles: ["parent"]
        }
      ]
    },
    {
      title: "معلومات أخرى",
      items: [
        {
          title: "حول المنصة",
          path: "/about",
          icon: "ℹ️",
          roles: null
        },
        {
          title: "الإعدادات",
          path: "/settings",
          icon: "⚙️",
          roles: ["admin"]
        }
      ]
    }
  ];

  if (!user) {
    return null; // Don't show sidebar if user is not logged in
  }

  return (
    <>
      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full bg-gradient-to-b from-[var(--color-primary-700)] to-[var(--color-primary-900)] text-white shadow-2xl z-50 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-80 lg:w-72'}
        ${isCollapsed ? 'overflow-hidden' : 'overflow-y-auto'}
      `} dir="rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'hidden lg:flex' : ''}`}>
            <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
              📚
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-xl">منصة الحلقات</h1>
                <p className="text-xs text-white/70">نظام إدارة الحلقات القرآنية</p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? '☰' : '✕'}
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-full">
                👤
              </div>
              <div>
                <p className="font-semibold">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-sm text-white/70">
                  {user.role === "parent" ? "ولي أمر" :
                   user.role === "student" ? "طالب" :
                   user.role === "teacher" ? "معلم" :
                   user.role === "administrator" ? "مدير" :
                   user.role === "supervisor" ? "مشرف" :
                   user.role === "admin" ? "مدير عام" :
                   user.role}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          {menuSections.map((section, sectionIndex) => {
            // Filter items based on user permissions
            const accessibleItems = section.items.filter(item => hasAccess(item.roles, item.path));
            
            if (accessibleItems.length === 0) return null;

            return (
              <div key={sectionIndex} className="mb-6">
                {!isCollapsed && (
                  <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3 px-2">
                    {section.title}
                  </h3>
                )}
                
                <ul className="space-y-1">
                  {accessibleItems.map((item, itemIndex) => {
                    const isActive = location.pathname === item.path;
                    
                    return (
                      <li key={itemIndex}>
                        <Link
                          to={item.path}
                          className={`
                            flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group
                            ${isActive 
                              ? 'bg-white/20 text-white shadow-lg' 
                              : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }
                            ${isCollapsed ? 'justify-center' : ''}
                          `}
                          title={isCollapsed ? item.title : ''}
                        >
                          <span className={`${isCollapsed ? 'text-xl' : 'text-lg'}`}>
                            {item.icon}
                          </span>
                          {!isCollapsed && (
                            <span className="font-medium text-sm">{item.title}</span>
                          )}
                          {isActive && !isCollapsed && (
                            <div className="mr-auto">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-white/20">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-lg 
              bg-red-600/80 hover:bg-red-700 transition-colors text-white font-medium
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'تسجيل الخروج' : ''}
          >
            <span className={isCollapsed ? 'text-xl' : 'text-lg'}>🚪</span>
            {!isCollapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
