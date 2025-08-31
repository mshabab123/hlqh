// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineExclamationCircle } from "react-icons/ai";
import { FaChalkboardTeacher, FaSchool, FaUsers, FaUserGraduate, FaUserTie, FaClipboardCheck, FaTrophy, FaChartBar, FaChild, FaUserFriends, FaCog, FaDatabase, FaUserShield } from "react-icons/fa";
import { MdAssignment, MdDashboard, MdSettings } from "react-icons/md";
import AuthNavbar from "../components/AuthNavbar";

export default function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Load user info from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      // Not logged in, redirect to login
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navigationCards = [
    {
      title: "إدارة المعلمين",
      description: "إدارة بيانات المعلمين وتعيين الفصول",
      icon: FaChalkboardTeacher,
      path: "/teachers",
      color: "bg-blue-500",
      roles: ["admin", "supervisor"]
    },
    {
      title: "إدارة الحلقات",
      description: "إنشاء وإدارة الفصول والحلقات",
      icon: FaUsers,
      path: "/classes",
      color: "bg-green-500",
      roles: ["admin", "administrator"]
    },
    {
      title: "إدارة مجمع الحلقات",
      description: "إدارة مراكز ومجمعات التحفيظ والدور النسائية",
      icon: FaSchool,
      path: "/schools",
      color: "bg-purple-500",
      roles: ["admin"]
    },
    {
      title: "إدارة مديري مراكز ومجمعات التحفيظ",
      description: "إدارة بيانات المديرين والصلاحيات",
      icon: FaUserTie,
      path: "/administrators",
      color: "bg-red-500",
      roles: ["admin"]
    },
    {
      title: "إدارة الطلاب",
      description: "إدارة بيانات الطلاب والتسجيل",
      icon: FaUserGraduate,
      path: "/students",
      color: "bg-orange-500",
      roles: ["admin", "supervisor", "administrator", "teacher"]
    },
    {
      title: "إدارة الفصول الدراسية",
      description: "إنشاء وإدارة الفصول الدراسية والمقررات",
      icon: "📅",
      path: "/semesters",
      color: "bg-indigo-500",
      roles: ["admin", "administrator"]
    },
    {
      title: "درجات الطلاب",
      description: "إدخال وإدارة درجات الطلاب في المقررات",
      icon: "📝",
      path: "/grading",
      color: "bg-teal-500",
      roles: ["admin", "administrator", "teacher"]
    },
    {
      title: "مقررات الحلقات",
      description: "إدارة المقررات والدورات لكل حلقة",
      icon: "📚",
      path: "/class-courses",
      color: "bg-cyan-500",
      roles: ["admin", "administrator"]
    },
    {
      title: "التقارير اليومية",
      description: "إنشاء وإدارة التقارير اليومية للمدارس والحلقات",
      icon: "📊",
      path: "/daily-reports",
      color: "bg-yellow-500",
      roles: ["admin", "administrator", "supervisor"]
    },
    {
      title: "نظام الحضور",
      description: "تسجيل ومتابعة حضور وغياب الطلاب",
      icon: FaClipboardCheck,
      path: "/attendance",
      color: "bg-pink-500",
      roles: ["admin", "administrator", "teacher"]
    },
    {
      title: "نظام النقاط",
      description: "إدارة نقاط التميز والمكافآت للطلاب",
      icon: FaTrophy,
      path: "/points",
      color: "bg-amber-500",
      roles: ["admin", "administrator", "teacher"]
    },
    {
      title: "الإحصائيات والتقارير",
      description: "عرض الإحصائيات والتقارير الشاملة",
      icon: FaChartBar,
      path: "/reports",
      color: "bg-emerald-500",
      roles: ["admin", "administrator", "supervisor"]
    },
    {
      title: "الأبناء",
      description: "متابعة أداء وتقدم الأبناء",
      icon: FaChild,
      path: "/children",
      color: "bg-rose-500",
      roles: ["parent"]
    },
    {
      title: "إدارة أولياء الأمور",
      description: "إدارة بيانات أولياء الأمور والربط بالطلاب",
      icon: FaUserFriends,
      path: "/parents",
      color: "bg-violet-500",
      roles: ["admin", "administrator"]
    },
    {
      title: "إدارة المستخدمين",
      description: "إدارة جميع المستخدمين والصلاحيات",
      icon: FaUserShield,
      path: "/user-management",
      color: "bg-slate-500",
      roles: ["admin"]
    },
    {
      title: "لوحة التحكم",
      description: "عرض ملخص شامل للنظام",
      icon: MdDashboard,
      path: "/dashboard",
      color: "bg-gray-600",
      roles: ["admin", "administrator", "supervisor"]
    },
    {
      title: "الإعدادات",
      description: "إعدادات النظام والتكوينات",
      icon: FaCog,
      path: "/settings",
      color: "bg-stone-500",
      roles: ["admin"]
    },
    {
      title: "قاعدة البيانات",
      description: "إدارة وصيانة قاعدة البيانات",
      icon: FaDatabase,
      path: "/database",
      color: "bg-zinc-600",
      roles: ["admin"]
    },
    {
      title: "واجباتي",
      description: "عرض ومتابعة الواجبات والمهام",
      icon: MdAssignment,
      path: "/assignments",
      color: "bg-lime-500",
      roles: ["student"]
    },
    {
      title: "درجاتي",
      description: "عرض الدرجات والتقييمات",
      icon: "🎯",
      path: "/my-grades",
      color: "bg-sky-500",
      roles: ["student", "parent"]
    },
    {
      title: "جدولي",
      description: "عرض الجدول الدراسي والمواعيد",
      icon: "📅",
      path: "/my-schedule",
      color: "bg-fuchsia-500",
      roles: ["student", "teacher", "parent"]
    }
  ];

  const hasAccess = (cardRoles) => {
    if (!user || !user.role) return false;
    return cardRoles.includes(user.role);
  };

  if (!user) {
    return null; // Or a loading spinner
  }

  return (
    <>
      {/* <AuthNavbar /> */}
      <div className="bg-[url('/baground.svg')] bg-cover bg-center bg-no-repeat bg-fixed bg-blend-overlay min-h-screen flex flex-col items-center justify-center font-[var(--font-family-arabic)] py-8">
        
        {/* Inactive User Warning */}
        {user && (user.is_active === false || user.account_status === 'pending_activation') && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 max-w-2xl w-full mx-auto">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AiOutlineExclamationCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>تنبيه:</strong> حسابك قيد المراجعة من الإدارة. سيتم إشعارك عند تفعيل الحساب بشكل كامل.
                  <br />
                  يمكنك تصفح المنصة بصلاحيات محدودة حتى يتم تفعيل حسابك.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Card */}
        <div
          className="bg-white/90 p-6 rounded-xl max-w-lg w-full shadow-xl space-y-4 text-center mb-8"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <h1 className="text-2xl font-bold text-[var(--color-primary-700)]">
            مرحباً بك في المنصة!
          </h1>
          <div className="text-lg font-semibold text-[var(--color-primary-700)]">
            {user.first_name} {user.second_name} {user.third_name}{" "}
            {user.last_name}
          </div>
          <div className="text-[var(--color-text-secondary)]">
            {user.role === "parent"
              ? "ولي أمر"
              : user.role === "student"
              ? "طالب"
              : user.role === "teacher"
              ? "معلم"
              : user.role === "administrator"
              ? "مدير"
              : user.role === "supervisor" 
              ? "مشرف"
              : user.role === "admin"
              ? "مدير عام"
              : user.role}
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl w-full px-4 mb-8">
          {navigationCards.map((card, index) => {
            if (!hasAccess(card.roles)) return null;
            
            return (
              <div
                key={index}
                onClick={() => navigate(card.path)}
                className="bg-white/95 p-5 rounded-xl shadow-lg cursor-pointer hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group"
                style={{ backdropFilter: "blur(2px)" }}
              >
                <div className={`${card.color} w-14 h-14 rounded-full flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform`}>
                  {typeof card.icon === 'string' ? (
                    <span className="text-white text-xl">{card.icon}</span>
                  ) : (
                    <card.icon className="text-white text-xl" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-[var(--color-primary-700)] mb-1 text-center">
                  {card.title}
                </h3>
                <p className="text-[var(--color-text-secondary)] text-center text-xs leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* User Info and Logout */}
        <div
          className="bg-white/90 p-4 rounded-xl max-w-lg w-full shadow-xl space-y-3 text-center"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div className="text-sm text-[var(--color-text-secondary)]">
            <span className="font-bold">البريد الإلكتروني:</span> {user.email}
          </div>
          {user.phone && (
            <div className="text-sm text-[var(--color-text-secondary)]">
              <span className="font-bold">الجوال:</span> {user.phone}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-2 rounded-lg font-semibold transition-colors text-sm"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </>
  );
}
