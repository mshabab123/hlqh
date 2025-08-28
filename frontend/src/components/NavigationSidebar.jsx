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
  AiOutlineSetting,
  AiOutlineCalendar,
  AiOutlineDatabase,
  AiOutlineLock,
  AiOutlineInfoCircle,
  AiOutlineUserAdd,
  AiOutlineCheckCircle,
  AiOutlineCrown
} from "react-icons/ai";
import { 
  FaChalkboardTeacher, 
  FaSchool, 
  FaUsers, 
  FaUserGraduate, 
  FaUserTie 
} from "react-icons/fa";

const NavigationSidebar = ({ isOpen, setIsOpen, className = "" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && window.innerWidth < 1024) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [setIsOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const hasAccess = (requiredRoles) => {
    if (!user || !user.role) return false;
    if (!requiredRoles) return true;
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    return user.role === requiredRoles;
  };

  const getRoleName = (role) => {
    const roleNames = {
      "parent": "ولي أمر",
      "student": "طالب", 
      "teacher": "معلم",
      "administrator": "مدير مجمع",
      "supervisor": "مشرف",
      "admin": "مدير عام"
    };
    return roleNames[role] || role;
  };

  const menuSections = [
    {
      title: "الرئيسية",
      icon: AiOutlineHome,
      items: [
        {
          title: "الصفحة الرئيسية",
          path: "/home",
          icon: AiOutlineHome,
          roles: null,
          description: "العودة إلى الصفحة الرئيسية"
        },
        {
          title: "لوحة التحكم",
          path: "/dashboard", 
          icon: AiOutlineDashboard,
          roles: ["admin", "supervisor", "administrator", "teacher"],
          description: "عرض إحصائيات النظام"
        }
      ]
    },
    {
      title: "إدارة النظام",
      icon: AiOutlineSetting,
      items: [
        {
          title: "مجمعات الحلقات",
          path: "/schools",
          icon: FaSchool,
          roles: ["admin"],
          description: "إدارة المجمعات والمدارس"
        },
        {
          title: "إدارة المديرين",
          path: "/administrators",
          icon: FaUserTie,
          roles: ["admin"],
          description: "إدارة مديري المجمعات"
        },
        {
          title: "مديري المنصة",
          path: "/admin-roots",
          icon: AiOutlineCrown,
          roles: ["admin"],
          description: "إدارة مديري المنصة وصلاحياتهم"
        },
        {
          title: "إدارة المستخدمين",
          path: "/user-management",
          icon: AiOutlineTeam,
          roles: ["admin"],
          description: "إدارة جميع المستخدمين"
        },
        {
          title: "قاعدة البيانات",
          path: "/database",
          icon: AiOutlineDatabase,
          roles: ["admin"],
          description: "عرض وإدارة قاعدة البيانات"
        },
        {
          title: "إدارة كلمات المرور",
          path: "/password-management",
          icon: AiOutlineLock,
          roles: ["admin", "administrator"],
          description: "إعادة تعيين كلمات المرور"
        }
      ]
    },
    {
      title: "الإدارة الأكاديمية",
      icon: AiOutlineBook,
      items: [
        {
          title: "الحلقات",
          path: "/classes",
          icon: FaUsers,
          roles: ["admin", "administrator"],
          description: "إدارة الحلقات والفصول"
        },
        {
          title: "الفصول الدراسية",
          path: "/semesters",
          icon: AiOutlineCalendar,
          roles: ["admin", "administrator"],
          description: "إدارة الفصول الدراسية"
        },
        {
          title: "مقررات الحلقات",
          path: "/class-courses",
          icon: AiOutlineBook,
          roles: ["admin", "administrator"],
          description: "إدارة المقررات والمناهج"
        }
      ]
    },
    {
      title: "إدارة الأشخاص",
      icon: AiOutlineUser,
      items: [
        {
          title: "المعلمين",
          path: "/teachers",
          icon: FaChalkboardTeacher,
          roles: ["admin", "supervisor"],
          description: "إدارة المعلمين والمعلمات"
        },
        {
          title: "الطلاب",
          path: "/students",
          icon: FaUserGraduate,
          roles: ["admin", "supervisor", "administrator", "teacher"],
          description: "إدارة الطلاب والطالبات"
        },
        {
          title: "أولياء الأمور",
          path: "/parents",
          icon: AiOutlineTeam,
          roles: ["admin", "supervisor"],
          description: "إدارة أولياء الأمور"
        }
      ]
    },
    {
      title: "التقييم والمتابعة",
      icon: AiOutlineFileText,
      items: [
        {
          title: "درجات الطلاب",
          path: "/grading",
          icon: AiOutlineFileText,
          roles: ["admin", "administrator", "teacher"],
          description: "إدارة الدرجات والتقييمات"
        },
        {
          title: "الحضور والغياب",
          path: "/attendance",
          icon: AiOutlineCheckCircle,
          roles: ["admin", "administrator", "teacher"],
          description: "متابعة حضور الطلاب"
        },
        {
          title: "نظام الحضور",
          path: "/attendance-system",
          icon: AiOutlineCalendar,
          roles: ["admin", "administrator", "teacher"],
          description: "نظام الحضور الإلكتروني"
        }
      ]
    },
    {
      title: "الشخصي",
      icon: AiOutlineUser,
      items: [
        {
          title: "الملف الشخصي",
          path: "/profile",
          icon: AiOutlineUser,
          roles: null,
          description: "عرض وتحديث البيانات الشخصية"
        }
      ]
    },
    {
      title: "عام",
      icon: AiOutlineInfoCircle,
      items: [
        {
          title: "حول النظام",
          path: "/about",
          icon: AiOutlineInfoCircle,
          roles: null,
          description: "معلومات عن النظام"
        }
      ]
    }
  ];

  if (!user) return null;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full shadow-2xl transition-all duration-300 ease-in-out
        text-white border-l border-primary-400/20
        ${!isOpen ? 'translate-x-full lg:translate-x-0' : 'translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'w-80 lg:w-72'}
        overflow-hidden flex flex-col z-40 lg:z-10
        ${className}
      `} 
      style={{
        background: 'linear-gradient(180deg, var(--color-primary-600), var(--color-primary-800), var(--color-primary-900))',
      }}
      dir="rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20 bg-primary-700/30">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'hidden lg:flex' : ''}`}>
            <div className="h-10 w-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center shadow-lg">
              <AiOutlineBook className="text-white text-lg" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-lg text-white">منصة الحلقات</h1>
                <p className="text-xs text-primary-100">نظام إدارة الحلقات القرآنية</p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsOpen(false);
              } else {
                setIsCollapsed(!isCollapsed);
              }
            }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title={isCollapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
          >
            {isCollapsed ? 
              <AiOutlineMenu className="text-white text-lg" /> : 
              <AiOutlineClose className="text-white text-lg" />
            }
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="p-4 border-b border-white/20 bg-primary-800/30">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary-400 to-primary-500 p-3 rounded-full shadow-lg">
                <AiOutlineUser className="text-white text-xl" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-sm text-primary-100 truncate">
                  {getRoleName(user.role)}
                </p>
                {user.is_active === false && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-xs text-red-300">حساب غير مفعل</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-primary-400/40 scrollbar-track-primary-900/20">
          {menuSections.map((section, sectionIndex) => {
            const accessibleItems = section.items.filter(item => hasAccess(item.roles));
            
            if (accessibleItems.length === 0) return null;

            return (
              <div key={sectionIndex} className={`${isCollapsed ? 'mb-4' : 'mb-6'}`}>
                {!isCollapsed ? (
                  <div className="flex items-center gap-2 mb-3 px-3 text-primary-200/80">
                    <section.icon className="text-base" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                ) : (
                  <div className="flex justify-center mb-2 text-primary-300/60" title={section.title}>
                    <section.icon className="text-base" />
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
                            if (window.innerWidth < 1024) {
                              setIsOpen(false);
                            }
                          }}
                          className={`
                            flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group
                            ${isActive 
                              ? 'bg-gradient-to-r from-primary-400/20 to-primary-300/15 text-white border-r-2 border-primary-400 shadow-lg' 
                              : 'text-primary-100/90 hover:bg-white/10 hover:text-white'
                            }
                            ${isCollapsed ? 'justify-center px-2' : ''}
                          `}
                          title={isCollapsed ? item.title : item.description}
                        >
                          <IconComponent className={`
                            ${isCollapsed ? 'text-xl' : 'text-lg'} 
                            ${isActive ? 'text-primary-300' : 'text-primary-200/70 group-hover:text-primary-100'}
                            transition-colors duration-200
                          `} />
                          {!isCollapsed && (
                            <span className="font-medium text-sm truncate flex-1">
                              {item.title}
                            </span>
                          )}
                          {isActive && !isCollapsed && (
                            <div className="w-2 h-2 bg-primary-400 rounded-full shadow-sm"></div>
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
        <div className="p-4 border-t border-white/20 bg-primary-800/30">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-lg 
              bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-500 hover:to-red-600 
              transition-all duration-200 text-white font-medium shadow-lg
              ${isCollapsed ? 'justify-center px-2' : ''}
              group
            `}
            title={isCollapsed ? 'تسجيل الخروج' : 'تسجيل الخروج من النظام'}
          >
            <AiOutlineLogout className={`${isCollapsed ? 'text-xl' : 'text-lg'} group-hover:scale-110 transition-transform`} />
            {!isCollapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default NavigationSidebar;