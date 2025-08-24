// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineExclamationCircle } from "react-icons/ai";
import { FaChalkboardTeacher, FaSchool, FaUsers, FaUserGraduate, FaUserTie } from "react-icons/fa";
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full px-4 mb-8">
          {navigationCards.map((card, index) => {
            if (!hasAccess(card.roles)) return null;
            
            return (
              <div
                key={index}
                onClick={() => navigate(card.path)}
                className="bg-white/90 p-6 rounded-xl shadow-xl cursor-pointer hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                style={{ backdropFilter: "blur(2px)" }}
              >
                <div className={`${card.color} w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto`}>
                  {typeof card.icon === 'string' ? (
                    <span className="text-white text-2xl">{card.icon}</span>
                  ) : (
                    <card.icon className="text-white text-2xl" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-[var(--color-primary-700)] mb-2 text-center">
                  {card.title}
                </h3>
                <p className="text-[var(--color-text-secondary)] text-center text-sm">
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
