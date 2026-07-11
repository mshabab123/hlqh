// src/pages/Home.jsx
import { useEffect, useMemo, useRef, useState } from "react";
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
  FaGripVertical,
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
  const [cardOrder, setCardOrder] = useState([]);
  const [draggedCardPath, setDraggedCardPath] = useState(null);
  const [orderSaveState, setOrderSaveState] = useState("idle");
  const cardOrderRef = useRef([]);
  const dragSessionRef = useRef(null);
  const saveStateTimerRef = useRef(null);
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

  useEffect(() => {
    if (!user?.role || user.role === "student") return undefined;

    let isMounted = true;
    const defaultOrder = accessibleCards.map((card) => card.path);

    axios
      .get("/api/profile/home-card-order")
      .then((response) => {
        if (!isMounted) return;
        const savedOrder = Array.isArray(response.data?.cardOrder)
          ? response.data.cardOrder
          : [];
        const allowedPaths = new Set(defaultOrder);
        const normalizedOrder = [
          ...savedOrder.filter((path) => allowedPaths.has(path)),
          ...defaultOrder.filter((path) => !savedOrder.includes(path)),
        ];
        cardOrderRef.current = normalizedOrder;
        setCardOrder(normalizedOrder);
      })
      .catch(() => {
        if (!isMounted) return;
        cardOrderRef.current = defaultOrder;
        setCardOrder(defaultOrder);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.role, accessibleCards]);

  useEffect(() => () => {
    if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
  }, []);

  const orderedAccessibleCards = useMemo(() => {
    if (cardOrder.length === 0) return accessibleCards;
    const cardsByPath = new Map(accessibleCards.map((card) => [card.path, card]));
    return cardOrder.map((path) => cardsByPath.get(path)).filter(Boolean);
  }, [accessibleCards, cardOrder]);

  const moveCard = (activePath, targetPath) => {
    const currentOrder = cardOrderRef.current.length
      ? [...cardOrderRef.current]
      : accessibleCards.map((card) => card.path);
    const fromIndex = currentOrder.indexOf(activePath);
    const toIndex = currentOrder.indexOf(targetPath);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return currentOrder;

    currentOrder.splice(fromIndex, 1);
    currentOrder.splice(toIndex, 0, activePath);
    cardOrderRef.current = currentOrder;
    setCardOrder(currentOrder);
    return currentOrder;
  };

  const saveCardOrder = async (nextOrder) => {
    setOrderSaveState("saving");
    try {
      await axios.put("/api/profile/home-card-order", { cardOrder: nextOrder });
      setOrderSaveState("saved");
      if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
      saveStateTimerRef.current = setTimeout(() => setOrderSaveState("idle"), 1800);
    } catch {
      setOrderSaveState("error");
    }
  };

  const handleDragPointerDown = (event, path) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragSessionRef.current = {
      path,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    setDraggedCardPath(path);
  };

  const handleDragPointerMove = (event) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    if (Math.hypot(event.clientX - session.startX, event.clientY - session.startY) > 5) {
      session.moved = true;
    }
    if (!session.moved) return;

    const targetCard = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest("[data-home-card-path]");
    const targetPath = targetCard?.getAttribute("data-home-card-path");
    if (targetPath && targetPath !== session.path) {
      moveCard(session.path, targetPath);
    }
  };

  const finishPointerDrag = (event) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragSessionRef.current = null;
    setDraggedCardPath(null);
    if (session.moved) saveCardOrder(cardOrderRef.current);
  };

  const handleDragKeyDown = (event, path) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();

    const currentOrder = cardOrderRef.current;
    const currentIndex = currentOrder.indexOf(path);
    const moveBackward = event.key === "ArrowRight" || event.key === "ArrowUp";
    const targetIndex = currentIndex + (moveBackward ? -1 : 1);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const nextOrder = moveCard(path, currentOrder[targetIndex]);
    saveCardOrder(nextOrder);
  };

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
            <div className="flex items-center gap-2">
              {orderSaveState !== "idle" && (
                <span
                  className={`text-xs font-semibold ${
                    orderSaveState === "error" ? "text-red-600" : "text-emerald-600"
                  }`}
                  role="status"
                >
                  {orderSaveState === "saving" && "جاري حفظ الترتيب..."}
                  {orderSaveState === "saved" && "تم حفظ الترتيب"}
                  {orderSaveState === "error" && "تعذر حفظ الترتيب"}
                </span>
              )}
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                {orderedAccessibleCards.length} خيارات
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {orderedAccessibleCards.map((card) => (
              <div
                key={`${card.path}-${card.title}`}
                data-home-card-path={card.path}
                className={`group relative min-h-[168px] rounded-xl border bg-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg ${
                  draggedCardPath === card.path
                    ? "scale-[0.98] border-primary-400 opacity-60 ring-2 ring-primary-200"
                    : "border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onPointerDown={(event) => handleDragPointerDown(event, card.path)}
                  onPointerMove={handleDragPointerMove}
                  onPointerUp={finishPointerDrag}
                  onPointerCancel={finishPointerDrag}
                  onKeyDown={(event) => handleDragKeyDown(event, card.path)}
                  className="touch-none absolute left-3 top-3 z-10 flex h-9 w-9 cursor-grab items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400 active:cursor-grabbing"
                  aria-label={`سحب كرت ${card.title} لتغيير ترتيبه`}
                  title="اسحب لتغيير الترتيب"
                >
                  <FaGripVertical aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(card.path)}
                  className="flex min-h-[168px] w-full flex-col rounded-xl p-5 text-right"
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
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

