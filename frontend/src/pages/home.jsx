// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { performLogout } from "../utils/logout";
import { AiOutlineExclamationCircle } from "react-icons/ai";
import { FaChalkboardTeacher, FaSchool, FaUsers, FaUserGraduate, FaUserTie, FaClipboardCheck, FaTrophy, FaChartBar, FaChild, FaUserFriends, FaCog, FaDatabase, FaUserShield, FaStar } from "react-icons/fa";
import { MdAssignment, MdDashboard, MdSettings } from "react-icons/md";
import AuthNavbar from "../components/AuthNavbar";
import Layout from "../components/Layout";

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
      navigate("/");
    }
  }, [navigate]);

  const handleLogout = async () => {
    await performLogout();
    navigate("/");
  };

  const navigationCards = [
    {
      title: "حلقاتي",
      description: "عرض الحلقات التي أدرّسها مع تمييز الحلقات الأساسية والإضافية.",
      icon: FaChalkboardTeacher,
      path: "/classes",
      color: "bg-teal-600",
      roles: ["teacher"]
    },
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
      title: "نظام الدرجات الشامل",
      description: "عرض شامل لدرجات وحضور ونقاط الطلاب مع إمكانية التعديل",
      icon: "📊",
      path: "/comprehensive-grading",
      color: "bg-blue-600",
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
      title: "إدارة النقاط",
      description: "نظام شامل لإدارة نقاط التميز والمكافآت للطلاب مع عرض تقويمي",
      icon: FaStar,
      path: "/points-management",
      color: "bg-yellow-500",
      roles: ["admin", "administrator", "supervisor", "teacher"]
    },
     {
      title: "تقارير النقاط وبرنامج فارس",
      description: "عرض الدرجات والتقييمات",
      icon: "🎯",
      path: "/points-reports",
      color: "bg-sky-500",
     roles: ["admin", "administrator", "supervisor", "teacher" ]
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
];

  const hasAccess = (cardRoles) => {
    if (!user || !user.role) return false;
    return cardRoles.includes(user.role);
  };

  // Determine if user should see the sidebar
  const shouldShowSidebar = () => {
    if (!user || !user.role) return true; // Default to showing sidebar
    return !['student', 'teacher', 'parent'].includes(user.role);
  };

  if (!user) {
    return null; // Or a loading spinner
  }

  // Main content component
  const HomeContent = () => (
    <div className="bg-[url('/baground.svg')] bg-cover bg-center bg-no-repeat min-h-[calc(100vh-5rem)] flex flex-col items-center font-[var(--font-family-arabic)] px-4 py-14">
        
        {/* Inactive User Warning */}
        {user && (user.is_active === false || user.account_status === 'pending_activation') && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3 max-w-2xl w-full mx-auto shrink-0">
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
          className="bg-white/90 p-6 rounded-xl max-w-xl w-full shadow-xl space-y-3 text-center mb-8 shrink-0"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <h1 className="text-2xl font-bold text-[var(--color-primary-700)]">
            مرحباً بك في المنصة!
          </h1>
          <div className="text-lg font-semibold text-[var(--color-primary-700)]">
            {user.first_name} {user.second_name} {user.third_name}{" "}
            {user.last_name}
          </div>
          <div className="text-base text-[var(--color-text-secondary)]">
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
          
          {/* Class Information */}
          {user.class_name && (
            <div className="mt-2 p-2 bg-blue-50 rounded-lg">
              <div className="text-sm font-semibold text-blue-700">الحلقة:</div>
              <div className="text-blue-600">{user.class_name}</div>
            </div>
          )}
          
          {user.school_name && (
            <div className="mt-2 p-2 bg-green-50 rounded-lg">
              <div className="text-sm font-semibold text-green-700">
                {user.role === "student" ? "المركز:" : "مجمع الحلقات:"}
              </div>
              <div className="text-green-600">{user.school_name}</div>
            </div>
          )}
          
          {user.classes && user.classes.length > 0 && (
            <div className="mt-2 p-2 bg-purple-50 rounded-lg">
              <div className="text-sm font-semibold text-purple-700 mb-2">
                {user.role === "teacher" ? "الحلقات التي تدرس فيها:" : "الحلقات:"}
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {user.classes.map((classItem, index) => (
                  <span
                    key={classItem.id || index}
                    className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full text-xs"
                  >
                    {classItem.name || classItem}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 auto-rows-auto content-start gap-6 max-w-7xl w-full px-2 mb-8">
          {navigationCards.map((card, index) => {
            if (!hasAccess(card.roles)) return null;
            
            return (
              <div
                key={index}
                onClick={() => navigate(card.path)}
                className="bg-white/95 p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 group flex flex-col items-center justify-center min-h-[188px]"
                style={{ backdropFilter: "blur(2px)" }}
              >
                <div className={`${card.color} w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform shrink-0`}>
                  {typeof card.icon === 'string' ? (
                    <span className="text-white text-xl">{card.icon}</span>
                  ) : (
                    <card.icon className="text-white text-xl" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-[var(--color-primary-700)] mb-2 text-center leading-tight">
                  {card.title}
                </h3>
                <p className="text-[var(--color-text-secondary)] text-center text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* User Info and Logout */}
        <div
          className="bg-white/90 p-4 rounded-xl max-w-xl w-full shadow-xl space-y-2 text-center shrink-0"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div className="text-xs text-[var(--color-text-secondary)]">
            <span className="font-bold">البريد الإلكتروني:</span> {user.email}
          </div>
          {user.phone && (
            <div className="text-xs text-[var(--color-text-secondary)]">
              <span className="font-bold">الجوال:</span> {user.phone}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-1.5 rounded-lg font-semibold transition-colors text-sm"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
  );

  // Conditional rendering based on user role
  if (shouldShowSidebar()) {
    return (
      <Layout>
        <HomeContent />
      </Layout>
    );
  }

  // For admin and other roles without sidebar
  return (
    <>
      {/* <AuthNavbar /> */}
      <HomeContent />
    </>
  );
}
