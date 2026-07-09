import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { performLogout } from "../utils/logout";
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
  AiOutlineCrown,
  AiOutlineHeart,
  AiOutlineStar,
  AiOutlineSafety,
  AiOutlineTable
} from "react-icons/ai";
import { 
  FaChalkboardTeacher, 
  FaSchool, 
  FaUsers, 
  FaUserGraduate, 
  FaUserTie,
  FaCertificate
} from "react-icons/fa";

const NavigationSidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed, className = "" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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

  const handleLogout = async () => {
    // Clear privilege cache on logout
    if (privilegeUtils && privilegeUtils.clearPrivilegeCache) {
      privilegeUtils.clearPrivilegeCache();
    }
    await performLogout();
    navigate("/");
  };

  // Import privilege utils at component level to use in async function
  const [privilegeUtils, setPrivilegeUtils] = useState(null);
  const [accessCache, setAccessCache] = useState(new Map());

  useEffect(() => {
    const loadPrivilegeUtils = async () => {
      try {
        const utils = await import('../utils/privilegeUtils');
        setPrivilegeUtils(utils);
      } catch (error) {
        console.error('Error loading privilege utils:', error);
      }
    };
    loadPrivilegeUtils();
  }, []);

  const hasAccess = async (requiredRoles, itemPath = null) => {
    if (!user || !user.role) return false;
    if (!requiredRoles) return true;
    
    const cacheKey = `${user.id}-${JSON.stringify(requiredRoles)}-${itemPath}`;
    
    // Check cache first for performance
    if (accessCache.has(cacheKey)) {
      return accessCache.get(cacheKey);
    }
    
    // Basic role-based check (legacy support)
    let basicAccess;
    if (Array.isArray(requiredRoles)) {
      basicAccess = requiredRoles.includes(user.role);
    } else {
      basicAccess = user.role === requiredRoles;
    }
    
    // If basic access is granted or no privilege utils loaded, return basic result
    if (basicAccess || !privilegeUtils) {
      setAccessCache(prev => new Map(prev).set(cacheKey, basicAccess));
      return basicAccess;
    }
    
    // Check custom privileges if basic access is denied
    try {
      const customAccess = await privilegeUtils.canAccessNavItem(user, requiredRoles, itemPath);
      setAccessCache(prev => new Map(prev).set(cacheKey, customAccess));
      return customAccess;
    } catch (error) {
      console.error('Error checking custom privileges:', error);
      setAccessCache(prev => new Map(prev).set(cacheKey, basicAccess));
      return basicAccess; // Fallback to basic check
    }
  };

  // Clear access cache when user changes
  useEffect(() => {
    setAccessCache(new Map());
  }, [user?.id]);

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
          description: "إدارة مجمعات الحلقات والحلقات التابعة لها"
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
        },
        {
          title: "إدارة الصلاحيات",
          path: "/privilege-management",
          icon: AiOutlineSafety,
          roles: ["admin"],
          description: "التحكم في صلاحيات المستخدمين"
        },
        {
          title: "صلاحيات الوظائف",
          path: "/feature-privileges",
          icon: AiOutlineSafety,
          roles: ["admin", "administrator"],
          description: "تحديد الأدوار المسموح لها بكل وظيفة (تسكين، تسجيل، شهادات...)"
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
          roles: ["admin", "administrator", "teacher"],
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
          path: "/certificates",
          title: "الشهادات",
          icon: FaCertificate,
          roles: ["admin", "administrator"],
          description: "منح وإلغاء وطباعة شهادات الطلاب"
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
          title: "نظام الدرجات الشامل",
          path: "/comprehensive-grading",
          icon: AiOutlineBook,
          roles: ["admin", "administrator", "teacher"],
          description: "عرض شامل للدرجات والحضور والنقاط"
        },
        {
          title: "نقاطي",
          path: "/student-points",
          icon: AiOutlineStar,
          roles: ["student"],
          description: "عرض النقاط اليومية والتقييمات"
        },
        {
          title: "الحضور والغياب",
          path: "/attendance",
          icon: AiOutlineCheckCircle,
          roles: ["admin", "administrator", "teacher"],
          description: "إدارة حضور وغياب الطلاب"
        },
        {
          title: "إدارة النقاط",
          path: "/points-management",
          icon: AiOutlineStar,
          roles: ["admin", "administrator", "supervisor", "teacher"],
          description: "إعطاء النقاط اليومية للطلاب"
        },
        {
          title: "تقارير النقاط",
          path: "/points-reports",
          icon: AiOutlineTable,
          roles: ["admin", "administrator", "supervisor", "teacher"],
          description: "عرض تقارير النقاط للطلاب"
        },
        {
          title: "التقارير اليومية",
          path: "/daily-reports",
          icon: AiOutlineFileText,
          roles: ["admin", "administrator", "supervisor"],
          description: "إدارة التقارير اليومية للمجمعات"
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
        },
        {
          title: "معلومات أبنائي",
          path: "/my-students",
          icon: AiOutlineHeart,
          roles: ["parent"],
          description: "عرض معلومات وبيانات أبنائي الطلاب"
        },
        {
          title: "شهاداتي",
          path: "/my-certificates",
          icon: FaCertificate,
          roles: ["student", "parent", "parent_student"],
          description: "عرض وتحميل شهادات الفصول الدراسية"
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
      {/* Overlay for mobile (covers the whole screen — the navbar is not fixed on mobile) */}
      {isOpen && (
        <div
          className="navigation-sidebar-backdrop fixed inset-0 bg-slate-950/35 backdrop-blur-[1px] lg:hidden z-[60]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`
          fixed top-[calc(50%+2.5rem)] z-[90] hidden h-16 w-8 -translate-y-1/2 translate-x-1/2
          items-center justify-center rounded-r-xl border border-white/35 bg-white/40
          text-primary-950 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-white/55 lg:flex
          ${isCollapsed ? 'right-20' : 'right-72'}
        `}
        title={isCollapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
        aria-label={isCollapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
      >
        {isCollapsed ? (
          <AiOutlineMenu className="text-lg" />
        ) : (
          <AiOutlineClose className="text-lg" />
        )}
      </button>

      {/* Sidebar: full height on mobile; below the fixed navbar on desktop */}
      <div className={`
        fixed top-0 right-0 h-screen lg:top-20 lg:h-[calc(100vh-5rem)] shadow-2xl transition-all duration-300 ease-in-out
        text-white border-l border-primary-300/25
        ${!isOpen ? 'translate-x-full lg:translate-x-0' : 'translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'w-80 lg:w-72'}
        overflow-hidden flex flex-col z-[70]
        ${className}
      `} 
      style={{
        background: 'var(--color-primary-500)',
      }}
      dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-center p-3 lg:hidden">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsOpen(false);
              } else {
                setIsCollapsed(!isCollapsed);
              }
            }}
            className="shrink-0 p-2.5 rounded-lg bg-white/30 hover:bg-white/45 border border-white/35 text-primary-900 shadow-sm transition-colors"
            title={isCollapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
            aria-label={isCollapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
          >
            {isCollapsed ? (
              <AiOutlineMenu className="text-primary-900 text-lg" />
            ) : (
              <AiOutlineClose className="text-primary-900 text-lg" />
            )}
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="p-4 border-b border-white/20 bg-white/10">
            <div className="flex items-center gap-3 rounded-xl bg-white/25 p-3 ring-1 ring-white/30 shadow-sm">
              <div className="bg-white/35 p-3 rounded-xl shadow-sm ring-1 ring-white/40">
                <AiOutlineUser className="text-primary-950 text-xl" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary-950 truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-sm font-medium text-primary-900 truncate">
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
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
          {menuSections.map((section, sectionIndex) => {
            return (
              <NavigationSection
                key={sectionIndex}
                section={section}
                user={user}
                location={location}
                isCollapsed={isCollapsed}
                setIsOpen={setIsOpen}
                privilegeUtils={privilegeUtils}
              />
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-white/15 bg-white/7">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-lg 
              bg-white/12 hover:bg-white/20 border border-white/20
              transition-all duration-200 text-white font-medium shadow-sm
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

// Component for handling async privilege checking in navigation sections
const NavigationSection = ({ section, user, location, isCollapsed, setIsOpen, privilegeUtils }) => {
  const [accessibleItems, setAccessibleItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSectionAccess = async () => {
      if (!user || !section.items) {
        setAccessibleItems([]);
        setLoading(false);
        return;
      }

      const itemsWithAccess = [];
      
      for (const item of section.items) {
        let hasAccess = false;

        // Basic role-based check first
        if (!item.roles) {
          hasAccess = true;
        } else if (Array.isArray(item.roles)) {
          hasAccess = item.roles.includes(user.role);
        } else {
          hasAccess = user.role === item.roles;
        }

        // If basic access denied, check custom privileges
        if (!hasAccess && privilegeUtils) {
          try {
            hasAccess = await privilegeUtils.canAccessNavItem(user, item.roles, item.path);
          } catch (error) {
            console.error('Error checking item privileges:', error);
            hasAccess = false;
          }
        }

        if (hasAccess) {
          itemsWithAccess.push(item);
        }
      }

      setAccessibleItems(itemsWithAccess);
      setLoading(false);
    };

    checkSectionAccess();
  }, [section, user, privilegeUtils]);

  if (loading) {
    return null; // Or a loading skeleton
  }

  if (accessibleItems.length === 0) {
    return null;
  }

  const sectionHasActiveItem = accessibleItems.some((item) => location.pathname === item.path);

  return (
    <div className={`${isCollapsed ? 'mb-4' : 'mb-5'}`}>
      {!isCollapsed ? (
        <div className={`
          flex items-center gap-2 mb-2 px-3 py-2 rounded-lg text-xs font-bold
          ${sectionHasActiveItem ? 'bg-white/25 text-white ring-1 ring-white/25' : 'text-white'}
        `}>
          <section.icon className="text-base shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            {section.title}
          </h3>
          <span className="mr-auto rounded-full bg-white/15 px-2 py-0.5 text-[11px] text-primary-50">
            {accessibleItems.length}
          </span>
        </div>
      ) : (
        <div className={`flex justify-center mb-2 text-white`} title={section.title}>
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
                  relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                  ${isActive 
                    ? 'bg-white/25 text-white shadow-sm ring-1 ring-white/25' 
                    : 'text-white hover:bg-white/15'
                  }
                  ${isCollapsed ? 'justify-center px-2' : ''}
                `}
                title={isCollapsed ? item.title : item.description}
              >
                {isActive && (
                  <span className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-primary-400" />
                )}
                <IconComponent className={`
                  ${isCollapsed ? 'text-xl' : 'text-lg'} 
                  text-white
                  transition-colors duration-200
                `} />
                {!isCollapsed && (
                  <span className="font-semibold text-sm truncate flex-1">
                    {item.title}
                  </span>
                )}
                {isActive && !isCollapsed && (
                  <div className="h-2 w-2 rounded-full bg-primary-200 shadow-sm"></div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default NavigationSidebar;



