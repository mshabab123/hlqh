import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  AiOutlineHome, 
  AiOutlineUser, 
  AiOutlineLogout, 
  AiOutlineMenu, 
  AiOutlineClose,
  AiOutlineBook,
  AiOutlineTeam,
  AiOutlineFileText,
  AiOutlineDashboard,
  AiOutlineUserAdd,
  AiOutlineForm,
  AiOutlineSetting
} from "react-icons/ai";
import { 
  FaChalkboardTeacher, 
  FaSchool, 
  FaUsers, 
  FaUserGraduate, 
  FaUserTie 
} from "react-icons/fa";

const Sidebar = ({ isOpen, setIsOpen }) => {
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

  // Close sidebar with ESC key on mobile
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && window.innerWidth < 1024) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [setIsOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Check if user has access to a specific route
  const hasAccess = (requiredRoles) => {
    if (!user || !user.role) return false;
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
      icon: <AiOutlineHome className="text-lg" />,
      items: [
        {
          title: "الصفحة الرئيسية",
          path: "/home",
          icon: AiOutlineHome,
          roles: null
        },
        {
          title: "لوحة التحكم",
          path: "/dashboard",
          icon: AiOutlineDashboard,
          roles: null
        }
      ]
    },
    {
      title: "الإدارة",
      icon: <AiOutlineSetting className="text-lg" />,
      items: [
        {
          title: "مجمعات الحلقات",
          path: "/schools",
          icon: FaSchool,
          roles: ["admin"]
        },
        {
          title: "الحلقات",
          path: "/classes",
          icon: FaUsers,
          roles: ["admin", "administrator"]
        },
        {
          title: "المعلمين",
          path: "/teachers",
          icon: FaChalkboardTeacher,
          roles: ["admin", "supervisor", "administrator"]
        },
        {
          title: "المديرين",
          path: "/administrators",
          icon: FaUserTie,
          roles: ["admin"]
        },
        {
          title: "الطلاب",
          path: "/students",
          icon: FaUserGraduate,
          roles: ["admin", "supervisor", "administrator", "teacher"]
        },
        {
          title: "أولياء الأمور",
          path: "/parents",
          icon: AiOutlineTeam,
          roles: ["admin", "supervisor", "administrator"]
        }
      ]
    },
    // {
    //   title: "التسجيل",
    //   items: [
    //     {
    //       title: "تسجيل المعلمين",
    //       path: "/TeacherRegister",
    //       icon: AiOutlineUserAdd,
    //       roles: ["admin", "supervisor"]
    //     },
    //     {
    //       title: "تسجيل أولياء الأمور",
    //       path: "/parent-registration",
    //       icon: AiOutlineUser,
    //       roles: null
    //     },
    //     {
    //       title: "تسجيل الطلاب",
    //       path: "/student-registration",
    //       icon: AiOutlineUser,
    //       roles: null
    //     },
    //     {
    //       title: "التسجيل العام",
    //       path: "/registration",
    //       icon: AiOutlineForm,
    //       roles: null
    //     }
    //   ]
    // },
    {
      title: "الشخصي",
      icon: <AiOutlineUser className="text-lg" />,
      items: [
        {
          title: "الملف الشخصي",
          path: "/profile",
          icon: AiOutlineUser,
          roles: null
        },
        {
          title: "الأبناء",
          path: "/children",
          icon: AiOutlineTeam,
          roles: ["parent"]
        },
        {
          title: "التقارير",
          path: "/reports",
          icon: AiOutlineFileText,
          roles: ["admin", "supervisor", "administrator", "teacher"]
        }
      ]
    },
    {
      title: "عام",
      icon: <AiOutlineBook className="text-lg" />,
      items: [
        {
          title: "حول المنصة",
          path: "/about",
          icon: AiOutlineBook,
          roles: null
        },
        {
          title: "الإعدادات",
          path: "/settings",
          icon: AiOutlineSetting,
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
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full bg-gradient-to-b from-[var(--color-primary-700)] to-[var(--color-primary-900)] text-white shadow-2xl z-50 transition-transform duration-300 ease-in-out
        ${!isOpen ? 'translate-x-full lg:translate-x-0' : 'translate-x-0'}
        ${isCollapsed ? 'lg:w-16' : 'w-80 lg:w-72'}
        overflow-y-auto
      `} dir="rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'hidden lg:flex' : ''}`}>
            <img
              src="/logo.svg"
              alt="شعار المنصة"
              className="h-10 w-10 object-contain rounded-full"
              loading="lazy"
            />
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-xl">منصة الحلقات</h1>
                <p className="text-xs text-white/70">نظام إدارة الحلقات القرآنية</p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              // On mobile, close sidebar; on desktop, toggle collapse
              if (window.innerWidth < 1024) {
                setIsOpen(false);
              } else {
                setIsCollapsed(!isCollapsed);
              }
            }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? <AiOutlineMenu /> : <AiOutlineClose />}
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-full">
                <AiOutlineUser className="text-xl" />
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
            const accessibleItems = section.items.filter(item => hasAccess(item.roles));
            
            if (accessibleItems.length === 0) return null;

            return (
              <div key={sectionIndex} className={`${isCollapsed ? 'mb-4' : 'mb-6'}`}>
                {!isCollapsed ? (
                  <div className="flex items-center gap-2 mb-3 px-3 text-white/60">
                    {section.icon}
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                ) : (
                  <div className="flex justify-center mb-2 text-white/40" title={section.title}>
                    {React.cloneElement(section.icon, { className: "text-sm" })}
                  </div>
                )}
                
                <ul className="space-y-1">
                  {accessibleItems.map((item, itemIndex) => {
                    const isActive = location.pathname === item.path;
                    const IconComponent = item.icon;
                    
                    return (
                      <li key={itemIndex}>
                        <Link
                          to={item.path}
                          onClick={() => {
                            // Close sidebar on mobile when clicking a link
                            if (window.innerWidth < 1024) {
                              setIsOpen(false);
                            }
                          }}
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
                          <IconComponent className={`
                            ${isCollapsed ? 'text-xl' : 'text-lg'} 
                            ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}
                          `} />
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
            <AiOutlineLogout className={isCollapsed ? 'text-xl' : 'text-lg'} />
            {!isCollapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </div>

    </>
  );
};

export default Sidebar;