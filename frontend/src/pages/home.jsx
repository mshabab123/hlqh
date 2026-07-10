// src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineExclamationCircle } from "react-icons/ai";
import {
  FaCertificate,
  FaChalkboardTeacher,
  FaChartBar,
  FaLayerGroup,
  FaChild,
  FaClipboardCheck,
  FaDatabase,
  FaSchool,
  FaStar,
  FaUserFriends,
  FaUserGraduate,
  FaUserShield,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";
import { MdAssignment, MdDashboard } from "react-icons/md";
import axios from "../utils/axiosConfig";
import Children from "./Children";

const roleLabels = {
  parent: "ولي أمر",
  student: "طالب",
  teacher: "معلم",
  administrator: "مدير مجمع",
  supervisor: "مشرف",
  admin: "مدير عام",
  parent_student: "ولي أمر / طالب",
};

const navigationCards = [
  {
    title: "حلقاتي",
    description: "عرض الحلقات المسندة ومتابعة الطلاب داخل كل حلقة.",
    icon: FaChalkboardTeacher,
    path: "/classes",
    color: "bg-teal-600",
    roles: ["teacher"],
  },
  {
    title: "إدارة المعلمين",
    description: "إدارة بيانات المعلمين وتعيينهم على الحلقات.",
    icon: FaChalkboardTeacher,
    path: "/teachers",
    color: "bg-blue-500",
    roles: ["admin", "supervisor"],
  },
  {
    title: "إدارة الحلقات",
    description: "إنشاء الحلقات وتنظيم الفصول والمقاعد.",
    icon: FaUsers,
    path: "/classes",
    color: "bg-green-600",
    roles: ["admin", "administrator"],
  },
  {
    title: "مجمعات الحلقات",
    description: "إدارة المجمعات والمدارس التابعة للمنصة.",
    icon: FaSchool,
    path: "/schools",
    color: "bg-purple-600",
    roles: ["admin"],
  },
  {
    title: "مديرو المجمعات",
    description: "إدارة المديرين وصلاحياتهم ونطاق عملهم.",
    icon: FaUserTie,
    path: "/administrators",
    color: "bg-red-500",
    roles: ["admin"],
  },
  {
    title: "إدارة الطلاب",
    description: "متابعة بيانات الطلاب والتسجيل والحالة الدراسية.",
    icon: FaUserGraduate,
    path: "/students",
    color: "bg-orange-500",
    roles: ["admin", "supervisor", "administrator", "teacher"],
  },
  {
    title: "الفصول الدراسية",
    description: "إدارة الفصول الدراسية والمقررات المرتبطة بها.",
    icon: MdAssignment,
    path: "/semesters",
    color: "bg-indigo-600",
    roles: ["admin", "administrator"],
  },
  {
    title: "الشهادات",
    description: "منح الشهادات وطباعتها حسب الفصل والدرجات.",
    icon: FaCertificate,
    path: "/certificates",
    color: "bg-amber-500",
    roles: ["admin", "administrator"],
  },
  {
    title: "المرحليات",
    description: "كل جزءين محفوظين = مرحلية. إضافة الجاهزين وتقييمهم.",
    icon: FaLayerGroup,
    path: "/stage-exams",
    color: "bg-teal-600",
    roles: ["admin", "administrator", "supervisor", "teacher"],
  },
  {
    title: "التقارير الدورية",
    description: "إرسال تقارير الطلاب لأولياء الأمور يومياً أو أسبوعياً بالبريد.",
    icon: FaChartBar,
    path: "/student-reports",
    color: "bg-teal-700",
    roles: ["admin"],
  },
  {
    title: "الدرجات الشاملة",
    description: "عرض الدرجات والحضور والنقاط في شاشة واحدة.",
    icon: MdAssignment,
    path: "/comprehensive-grading",
    color: "bg-blue-600",
    roles: ["admin", "administrator", "teacher"],
  },
  {
    title: "مقررات الحلقات",
    description: "تنظيم المقررات والمناهج لكل حلقة.",
    icon: MdAssignment,
    path: "/class-courses",
    color: "bg-cyan-600",
    roles: ["admin", "administrator"],
  },
  {
    title: "التقارير اليومية",
    description: "إنشاء ومراجعة التقارير اليومية للمجمعات.",
    icon: MdAssignment,
    path: "/daily-reports",
    color: "bg-yellow-500",
    roles: ["admin", "administrator", "supervisor"],
  },
  {
    title: "الحضور والغياب",
    description: "تسجيل ومتابعة حضور وغياب الطلاب.",
    icon: FaClipboardCheck,
    path: "/attendance",
    color: "bg-pink-500",
    roles: ["admin", "administrator", "teacher"],
  },
  {
    title: "إدارة النقاط",
    description: "إضافة نقاط التميز ومتابعة سجل المكافآت.",
    icon: FaStar,
    path: "/points-management",
    color: "bg-yellow-600",
    roles: ["admin", "administrator", "supervisor", "teacher"],
  },
  {
    title: "تقارير النقاط",
    description: "تحليل نقاط الطلاب وتصفيتها حسب الحلقة والفترة.",
    icon: FaStar,
    path: "/points-reports",
    color: "bg-sky-500",
    roles: ["admin", "administrator", "supervisor", "teacher"],
  },
  {
    title: "الأبناء",
    description: "متابعة أداء الأبناء وبياناتهم الدراسية.",
    icon: FaChild,
    path: "/children",
    color: "bg-rose-500",
    roles: ["parent"],
  },
  {
    title: "أولياء الأمور",
    description: "إدارة بيانات أولياء الأمور وربطهم بالطلاب.",
    icon: FaUserFriends,
    path: "/parents",
    color: "bg-violet-500",
    roles: ["admin", "supervisor"],
  },
  {
    title: "المستخدمون",
    description: "إدارة الحسابات والصلاحيات الأساسية.",
    icon: FaUserShield,
    path: "/user-management",
    color: "bg-slate-600",
    roles: ["admin"],
  },
  {
    title: "لوحة التحكم",
    description: "ملخص سريع لمؤشرات النظام الرئيسية.",
    icon: MdDashboard,
    path: "/dashboard",
    color: "bg-gray-700",
    roles: ["admin", "administrator", "supervisor", "teacher"],
  },
  {
    title: "قاعدة البيانات",
    description: "عرض جداول قاعدة البيانات لأغراض الإدارة.",
    icon: FaDatabase,
    path: "/database",
    color: "bg-zinc-700",
    roles: ["admin"],
  },
  {
    title: "شهاداتي",
    description: "عرض وتحميل شهادات الفصول الدراسية.",
    icon: FaCertificate,
    path: "/my-certificates",
    color: "bg-emerald-600",
    roles: ["parent", "parent_student"],
  },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/");
      return;
    }

    const parsedUser = JSON.parse(stored);
    setUser(parsedUser);

    axios
      .get("/api/profile/me")
      .then((response) => {
        const refreshedUser = {
          ...parsedUser,
          ...response.data.user,
          user_type: response.data.user.role || parsedUser.user_type,
        };
        localStorage.setItem("user", JSON.stringify(refreshedUser));
        setUser(refreshedUser);
      })
      .catch(() => {
        // Keep the locally stored user if the profile refresh is unavailable.
      });
  }, [navigate]);

  const accessibleCards = useMemo(() => {
    if (!user?.role) return [];
    return navigationCards.filter((card) => card.roles.includes(user.role));
  }, [user?.role]);

  if (!user) {
    return null;
  }

  if (user.role === "student") {
    return <Children />;
  }

  const fullName = [user.first_name, user.second_name, user.third_name, user.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto font-[var(--font-family-arabic)]" dir="rtl">
      <div className="flex w-full flex-col gap-6">
        {(user.is_active === false || user.account_status === "pending_activation") && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
            <div className="flex items-start gap-3">
              <AiOutlineExclamationCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm leading-6">
                <strong>تنبيه:</strong> حسابك قيد المراجعة من الإدارة. يمكنك تصفح المنصة بصلاحيات محدودة حتى يتم تفعيل الحساب.
              </p>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div>
            <div className="p-4 sm:p-5">
              <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 ring-1 ring-primary-100">
                {roleLabels[user.role] || user.role}
              </span>
              <h1 className="mt-3 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
                مرحبا بك، {fullName || "المستخدم"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                اختر الوجهة التي تحتاجها لإدارة الحلقات والطلاب والتقارير من مكان واحد.
              </p>
            </div>

            {false && (
            <aside className="border-t border-slate-200 bg-slate-900 p-5 text-white lg:border-r lg:border-t-0">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <AiOutlineUser className="text-xl" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-bold">{fullName || "المستخدم"}</div>
                  <div className="text-sm text-white/60">{roleLabels[user.role] || user.role}</div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-white/75">
                  <AiOutlineMail className="shrink-0" />
                  <span className="truncate">{user.email || "-"}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-white/75">
                    <AiOutlinePhone className="shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15"
              >
                <AiOutlineLogout />
                تسجيل الخروج
              </button>
            </aside>
            )}
          </div>

          {(user.class_name || user.school_name || user.classes?.length > 0) && (
            <div className="grid gap-3 border-t border-slate-200 p-5 sm:p-6 lg:grid-cols-3 lg:p-8">
              {user.class_name && (
                <div className="rounded-lg bg-blue-50 p-3">
                  <div className="text-sm font-semibold text-blue-700">الحلقة</div>
                  <div className="mt-1 text-blue-900">{user.class_name}</div>
                </div>
              )}

              {user.school_name && (
                <div className="rounded-lg bg-emerald-50 p-3">
                  <div className="text-sm font-semibold text-emerald-700">مجمع الحلقات</div>
                  <div className="mt-1 text-emerald-900">{user.school_name}</div>
                </div>
              )}

              {user.classes?.length > 0 && (
                <div className="rounded-lg bg-purple-50 p-3">
                  <div className="mb-2 text-sm font-semibold text-purple-700">الحلقات</div>
                  <div className="flex flex-wrap gap-2">
                    {user.classes.map((classItem, index) => (
                      <span
                        key={classItem.id || index}
                        className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700"
                      >
                        {classItem.name || classItem}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">الاختصارات</h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
              {accessibleCards.length} خيارات
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {accessibleCards.map((card) => (
              <button
                key={`${card.path}-${card.title}`}
                type="button"
                onClick={() => navigate(card.path)}
                className="group flex min-h-[168px] flex-col rounded-xl border border-slate-200 bg-white p-5 text-right shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg"
              >
                <span className={`${card.color} mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-white shadow-sm transition-transform group-hover:scale-105`}>
                  <card.icon className="text-xl" />
                </span>
                <span className="mb-2 text-base font-bold leading-tight text-slate-900">
                  {card.title}
                </span>
                <span className="text-sm leading-6 text-slate-600">
                  {card.description}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

