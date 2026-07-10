import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { performLogout } from "../utils/logout";
import {
  AiOutlineLogout,
  AiOutlineUser,
  AiOutlineHome,
  AiOutlineTeam,
  AiOutlineMenu,
  AiOutlineClose,
  AiOutlineDashboard,
  AiOutlineBook,
  AiOutlineBell,
  AiOutlineCalendar,
  AiOutlineFileText,
  AiOutlineBank,
  AiOutlineAppstore,
  AiOutlineInfoCircle,
  AiOutlinePhone,
  AiOutlineMail,
} from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

async function refreshCurrentUser() {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const response = await fetch(`${API_BASE}/api/profile/me`, {
      credentials: "include",
      headers,
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.user) return null;

    const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
    const mergedUser = { ...existingUser, ...data.user };
    localStorage.setItem("user", JSON.stringify(mergedUser));
    return mergedUser;
  } catch (error) {
    return null;
  }
}

const getNavLinks = (userRole, isActive) => {
  // For inactive users, only show about and profile
  if (!isActive) {
    return [
      { to: "/about", label: "حول النظام", icon: <AiOutlineFileText /> },
      { to: "/profile", label: "الملف الشخصي", icon: <AiOutlineUser /> },
    ];
  }

  // For active users, show full navigation
  const baseLinks = [
    { to: "/home", label: "الرئيسي", icon: <AiOutlineHome /> },
    { to: "/about", label: "عن المنصة", icon: <AiOutlineInfoCircle /> },
    { to: "/profile", label: "الملف الشخصي", icon: <AiOutlineUser /> },
  ];

  // Add Children link for parent, admin, administrator, and teacher roles
  if (['parent', 'admin', 'administrator', 'teacher'].includes(userRole)) {
    baseLinks.splice(2, 0, { to: "/children", label: "الأبناء", icon: <AiOutlineTeam /> });
  }

  return baseLinks;
};

export default function AuthNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState(0); // عدد الطلاب الجاهزين للمرحليات
  const [navLinks, setNavLinks] = useState([]);
  const [showInactiveModal, setShowInactiveModal] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      const isActive = parsedUser.is_active !== false; // Default to true if undefined
      setNavLinks(getNavLinks(parsedUser.role || parsedUser.user_type, isActive));

      refreshCurrentUser().then((refreshedUser) => {
        if (!refreshedUser) return;

        const refreshedIsActive = refreshedUser.is_active !== false;
        setUser(refreshedUser);
        setNavLinks(getNavLinks(refreshedUser.role || refreshedUser.user_type, refreshedIsActive));
        if (refreshedIsActive) {
          setShowInactiveModal(false);
        }
      });
      
      // Show modal for inactive users, but only on certain pages
      if (parsedUser.is_active === false && location.pathname !== "/about") {
        setShowInactiveModal(true);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    let intervalId;
    let cancelled = false;

    const refreshIfInactive = async () => {
      if (!user || user.is_active !== false) return;

      const refreshedUser = await refreshCurrentUser();
      if (!refreshedUser || cancelled) return;

      setUser(refreshedUser);
      const isActive = refreshedUser.is_active !== false;
      setNavLinks(getNavLinks(refreshedUser.role || refreshedUser.user_type, isActive));
      if (isActive) {
        setShowInactiveModal(false);
      }
    };

    refreshIfInactive();

    if (user?.is_active === false) {
      intervalId = setInterval(refreshIfInactive, 30000);
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.is_active]);

  // إشعار المرحليات: عدد الطلاب الذين أكملوا جزءين وجاهزون لدخول مرحلية.
  useEffect(() => {
    const role = user?.role;
    if (!['teacher', 'admin', 'administrator', 'supervisor'].includes(role)) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchReadyCount = () => {
      fetch(`${API_BASE}/api/stage-exams/ready`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setNotifications(Number(data.count) || 0);
        })
        .catch(() => {});
    };

    fetchReadyCount();
    const interval = setInterval(fetchReadyCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.role]);

  const openNotifications = () => {
    setIsMobileMenuOpen(false);
    navigate('/stage-exams');
  };

  const handleLogout = async () => {
    await performLogout();
    navigate("/");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Inactive Account Modal */}
      {showInactiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-pulse">
            <div className="bg-orange-500 text-white p-6 rounded-t-2xl text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <AiOutlineBell className="text-4xl" />
                <h2 className="text-2xl font-bold">حسابك غير مفعل</h2>
              </div>
              <p className="text-lg font-semibold mb-2">
                للوصول إلى جميع خدمات المنصة
              </p>
              <p className="text-base opacity-90">
                يجب تفعيل حسابك أولاً
              </p>
            </div>
            
            <div className="p-6 text-center">
              <p className="text-gray-700 mb-4">
                يرجى التواصل مع إدارة النظام لتفعيل حسابك
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <h3 className="font-bold mb-3 text-orange-800 flex items-center justify-center gap-2">
                  <AiOutlineInfoCircle />
                  معلومات التواصل
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <AiOutlinePhone className="text-orange-600" />
                    <span>+966 5 33 69 33 55</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <AiOutlineMail className="text-orange-600" />
                    <span>malrizah@gmail.com</span>
                  </div>
                </div>
                <p className="text-xs mt-2 text-gray-500">
                  Contact administrator to activate your account
                </p>
              </div>
              
              <button
                onClick={() => setShowInactiveModal(false)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-2"
              >
                حسناً أكمل التصفح
              </button>
              
              <button
                onClick={() => {
                  setShowInactiveModal(false);
                  navigate("/about");
                }}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm"
              >
                اذهب لصفحة حول النظام
              </button>
            </div>
          </div>
        </div>
      )}

    <nav className="relative lg:fixed lg:top-0 lg:left-0 lg:right-0 w-full bg-gradient-to-l from-[var(--color-primary-100)] via-[var(--color-primary-400)] to-[var(--color-primary-700)] text-white shadow-xl z-[80]" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo + App name */}
          <Link to="/home" className="auth-navbar-brand flex items-center gap-3 hover:opacity-90 transition-all duration-300">
            <img
              src="/logo.svg"
              alt="شعار المنصة"
              className="h-12 w-12 object-contain rounded-full shadow-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm"
              loading="lazy"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-xl md:text-2xl tracking-tight drop-shadow-md">
                منصة الحلقات
              </span>
              {user && (
                <span className="text-xs text-white/80 font-medium hidden md:block">
                  مرحباً، {user.first_name || 'المستخدم'} {user.last_name || ''}
                </span>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-300 hover:bg-white/10 hover:shadow-md ${
                  location.pathname === link.to
                    ? "bg-white/20 text-white font-bold shadow-md"
                    : "text-white/90 hover:text-white"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span className="text-sm font-semibold hidden xl:block">{link.label}</span>
              </Link>
            ))}

            {/* Notifications — طلاب جاهزون للمرحليات */}
            <button
              onClick={openNotifications}
              className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={notifications > 0 ? `${notifications} طالب جاهز لدخول مرحلية` : 'الإشعارات'}
            >
              <AiOutlineBell className="h-5 w-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {notifications}
                </span>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-white bg-red-600/80 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <AiOutlineLogout className="h-4 w-4" />
              <span className="hidden xl:block">خروج</span>
            </button>
          </div>

          {/* Mobile menu button — fixed so it stays visible while the navbar
              itself scrolls away with the page on mobile. */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden fixed top-4 left-4 z-[95] p-2.5 rounded-xl bg-[var(--color-primary-700)]/95 shadow-lg border border-white/25 hover:bg-[var(--color-primary-800)] transition-colors"
            aria-label="فتح القائمة"
          >
            {isMobileMenuOpen ? (
              <AiOutlineClose className="h-6 w-6" />
            ) : (
              <AiOutlineMenu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Backdrop for the mobile menu */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-slate-950/35 z-[90]"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Navigation — fixed overlay panel so it opens in view at any
            scroll position (the navbar is not fixed on mobile). */}
        <div
          className={`lg:hidden fixed top-16 inset-x-3 z-[94] rounded-xl shadow-2xl bg-[var(--color-primary-800)] px-3 overflow-y-auto transition-all duration-300 ${
            isMobileMenuOpen ? "max-h-[75vh] pb-4" : "max-h-0 py-0 invisible"
          }`}
          dir="rtl"
        >
          <div className="flex flex-col gap-2 pt-2 border-t border-white/20 text-white">
            {/* User info on mobile */}
            {user && (
              <div className="px-4 py-3 bg-white/15 rounded-lg mb-2 ring-1 ring-white/20">
                <p className="text-white font-bold">
                  مرحباً، {user.first_name || 'المستخدم'} {user.last_name || ''}
                </p>
                <p className="text-white/90 text-sm">
                  {user.email}
                </p>
              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  location.pathname === link.to
                    ? "bg-white/25 text-white font-bold"
                    : "text-white hover:bg-white/15"
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                <span className="font-semibold">{link.label}</span>
              </Link>
            ))}

            {/* Notifications on mobile — طلاب جاهزون للمرحليات */}
            <button
              onClick={openNotifications}
              className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/15 rounded-lg transition-colors"
            >
              <span className="text-xl relative">
                <AiOutlineBell />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                    {notifications}
                  </span>
                )}
              </span>
              <span>الإشعارات{notifications > 0 ? ` — ${notifications} جاهز للمرحليات` : ''}</span>
            </button>

            {/* Logout on mobile */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-white bg-red-600/80 hover:bg-red-700 rounded-lg font-semibold transition-colors mt-2"
            >
              <AiOutlineLogout className="text-xl" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
