import { useEffect, useMemo, useState } from "react";
import {
  FaAward,
  FaBook,
  FaBullseye,
  FaCalendarAlt,
  FaChevronDown,
  FaGraduationCap,
  FaLayerGroup,
  FaTrophy,
  FaUserGraduate,
} from "react-icons/fa";
import axios from "../utils/axiosConfig";
import { getSurahNameFromId } from "../utils/quranData";
import { calculateQuranBlocks } from "../utils/studentUtils";
import QuranBlocksGrid from "./QuranBlocksGrid";
import StudentCertificatesButton from "./StudentCertificatesButton";
import CertificatePreviewModal from "./CertificatePreviewModal";

// لوحة الطالب الحديثة في صفحة الأبناء: بطل تعريفي، شريط فصول أفقي،
// بطاقات إحصائية، شهادة الفصل، وتبويبات (الدرجات/المسيرة/الحضور/الهدف/النقاط).

const SEMESTER_TYPE_TEXT = { first: "الأول", second: "الثاني", summer: "الصيفي" };

const semesterLabel = (option) =>
  `الفصل ${SEMESTER_TYPE_TEXT[option.type] || option.type || ""} ${option.year || ""}`.trim();

const gradeValueOf = (grade) => {
  const raw = grade.grade ?? grade.grade_value ?? grade.score;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
};

const gradePercentOf = (grade) => {
  const value = gradeValueOf(grade);
  if (value === null) return null;
  if (grade.max_grade && Number(grade.max_grade) > 0) return (value / Number(grade.max_grade)) * 100;
  return value;
};

const averagePercent = (grades = []) => {
  const values = grades.map(gradePercentOf).filter((v) => Number.isFinite(v));
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
};

const parseRef = (reference) => {
  if (!reference || typeof reference !== "string") return null;
  const [surahPart, ayahPart] = reference.split(":");
  const surahId = parseInt(surahPart, 10);
  if (Number.isNaN(surahId)) return null;
  const ayah = ayahPart ? parseInt(ayahPart, 10) : null;
  return { surahId, ayah: Number.isNaN(ayah) ? null : ayah };
};

const surahRangeLabel = (grade) => {
  const start = parseRef(grade.start_reference);
  const end = parseRef(grade.end_reference);
  if (start) {
    const startName = getSurahNameFromId(start.surahId) || grade.surah_name || "-";
    const left = start.ayah ? `${startName} ${start.ayah}` : startName;
    if (end?.surahId) {
      const endName = getSurahNameFromId(end.surahId) || startName;
      const right = end.ayah ? `${endName} ${end.ayah}` : endName;
      return left === right ? left : `${left} ← ${right}`;
    }
    return left;
  }
  return grade.surah_name || grade.start_reference || "-";
};

const dateLabel = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("ar-SA");
};

const scoreTone = (percent) => {
  if (percent >= 90) return { bar: "bg-emerald-500", text: "text-emerald-700", soft: "bg-emerald-50" };
  if (percent >= 75) return { bar: "bg-teal-500", text: "text-teal-700", soft: "bg-teal-50" };
  if (percent >= 50) return { bar: "bg-amber-500", text: "text-amber-700", soft: "bg-amber-50" };
  return { bar: "bg-red-500", text: "text-red-600", soft: "bg-red-50" };
};

function StatTile({ label, value, sub, tone = "text-slate-800", icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {icon && <span className="text-slate-300">{icon}</span>}
      </div>
      <p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

const ATTENDANCE_STATUS = {
  present: { label: "حاضر", dot: "bg-emerald-500", tile: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  absent: { label: "غائب", dot: "bg-red-500", tile: "border-red-300 bg-red-50 text-red-700" },
  late: { label: "متأخر", dot: "bg-amber-400", tile: "border-amber-300 bg-amber-50 text-amber-800" },
  excused: { label: "مستأذن", dot: "bg-sky-400", tile: "border-sky-300 bg-sky-50 text-sky-800" },
};

const DEFAULT_ATTENDANCE_TILE = { label: "غير محدد", dot: "bg-slate-300", tile: "border-slate-200 bg-slate-50 text-slate-500" };

export default function ChildDashboard({
  child,
  childData,
  semesterOptions = [],
  isStudentView = false,
  onBack,
  onOpenRegistration,
  registeringSemesterId,
  attendanceBySemester = {},
  attendanceLoadingSemesterId,
  onFetchAttendance,
}) {
  const [activeSemesterId, setActiveSemesterId] = useState(null);
  const [activeTab, setActiveTab] = useState("grades");
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [certificates, setCertificates] = useState([]);
  const [semesterGoals, setSemesterGoals] = useState([]);
  const [stageInfo, setStageInfo] = useState(null); // المرحليات
  const [previewCertificate, setPreviewCertificate] = useState(null);

  const studentId = child?.student_id;

  // شهادات الطالب وأهداف فصوله — تُجلب مرة لكل طالب.
  useEffect(() => {
    if (!studentId) return;
    setCertificates([]);
    setSemesterGoals([]);
    axios
      .get(`/api/certificates/student/${studentId}`)
      .then((res) => setCertificates(res.data.certificates || []))
      .catch(() => setCertificates([]));
    axios
      .get(`/api/students/${studentId}/semester-goals`)
      .then((res) => setSemesterGoals(res.data.goals || []))
      .catch(() => setSemesterGoals([]));
    axios
      .get(`/api/stage-exams/student/${studentId}`)
      .then((res) => setStageInfo(res.data))
      .catch(() => setStageInfo(null));
  }, [studentId]);

  // بناء نموذج الفصول: خيارات التسجيل + الفصول المستنتجة من الدرجات.
  const semesters = useMemo(() => {
    const grades = childData?.grades || [];
    const byId = new Map();

    const gradeGroups = grades.reduce((acc, grade) => {
      const key = String(grade.semester_id || grade.semester_name || "unknown");
      if (!acc[key]) {
        acc[key] = { id: key, label: grade.semester_name || "فصل غير محدد", grades: [], classNames: [] };
      }
      acc[key].grades.push(grade);
      if (grade.class_name && !acc[key].classNames.includes(grade.class_name)) {
        acc[key].classNames.push(grade.class_name);
      }
      return acc;
    }, {});

    semesterOptions.forEach((option) => {
      const id = String(option.id);
      const group = gradeGroups[id];
      byId.set(id, {
        id,
        option,
        label: semesterLabel(option),
        schoolName: option.school_name,
        registrationOpen: Boolean(option.registration_open),
        registrationStatus: option.registration_status,
        registeredClassName: option.registered_class_name,
        startDate: option.start_date,
        classNames: [...new Set([option.registered_class_name, ...(group?.classNames || [])].filter(Boolean))],
        grades: group?.grades || [],
      });
    });

    Object.values(gradeGroups).forEach((group) => {
      if (!byId.has(group.id)) {
        byId.set(group.id, {
          ...group,
          option: null,
          registrationOpen: false,
          registrationStatus: null,
          registeredClassName: null,
          startDate: group.grades[0]?.date_graded || group.grades[0]?.date || group.grades[0]?.created_at || null,
        });
      }
    });

    return Array.from(byId.values())
      .map((semester) => ({
        ...semester,
        average: averagePercent(semester.grades),
        gradesCount: semester.grades.length,
        hasGrades: semester.grades.length > 0,
        isRegistered: Boolean(semester.registrationStatus) || semester.grades.length > 0,
        certificate: certificates.find((c) => String(c.semester_id) === semester.id) || null,
      }))
      .sort((a, b) => {
        const at = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bt = b.startDate ? new Date(b.startDate).getTime() : 0;
        return bt - at;
      });
  }, [childData?.grades, semesterOptions, certificates]);

  const active =
    semesters.find((s) => s.id === activeSemesterId) ||
    semesters.find((s) => s.isRegistered && s.registrationOpen) ||
    semesters.find((s) => s.isRegistered) ||
    semesters[0] ||
    null;

  // جلب حضور الفصل المعروض تلقائياً.
  useEffect(() => {
    if (active?.id && active.id !== "unknown" && onFetchAttendance) {
      onFetchAttendance(active.id);
    }
    setExpandedCourses(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, studentId]);

  if (!child) return null;

  const stats = childData?.statistics || {};
  const attendance = active ? attendanceBySemester[active.id] : null;
  const attendanceRate = attendance?.statistics?.attendance_rate;
  const activeGoal = active
    ? semesterGoals.find((g) => String(g.semester_id) === String(active.id)) || null
    : null;

  const statusText = active
    ? active.registeredClassName
      ? "تم التسكين"
      : active.registrationStatus
        ? "بانتظار الحلقة"
        : active.hasGrades
          ? "سجل مسبقاً"
          : "غير مسجل"
    : "-";

  // تجميع درجات الفصل حسب المقرر
  const courseGroups = active
    ? Object.values(
        active.grades.reduce((acc, grade) => {
          const key = grade.course_name || "غير محدد";
          if (!acc[key]) acc[key] = { name: key, weight: grade.percentage ?? null, grades: [] };
          acc[key].grades.push(grade);
          if (acc[key].weight === null && grade.percentage !== undefined) acc[key].weight = grade.percentage;
          return acc;
        }, {})
      ).map((course) => ({
        ...course,
        average: averagePercent(course.grades),
        sorted: [...course.grades].sort(
          (a, b) =>
            new Date(b.date || b.date_graded || b.created_at || 0) -
            new Date(a.date || a.date_graded || a.created_at || 0)
        ),
      }))
    : [];

  const toggleCourse = (name) =>
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const tone = active ? scoreTone(active.average) : scoreTone(0);

  const TABS = [
    { id: "grades", label: "الدرجات", icon: <FaGraduationCap /> },
    { id: "journey", label: "المسيرة", icon: <FaBook /> },
    { id: "attendance", label: "الحضور", icon: <FaCalendarAlt /> },
    { id: "goal", label: "الهدف", icon: <FaBullseye /> },
    { id: "stages", label: "المرحليات", icon: <FaLayerGroup /> },
    { id: "points", label: "النقاط", icon: <FaTrophy /> },
  ];

  return (
    <div className="space-y-4">
      {/* البطل التعريفي */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[var(--color-primary-700)] via-teal-700 to-teal-600 p-5 text-white shadow-lg">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl font-black ring-1 ring-white/30 backdrop-blur-sm">
              {(child.first_name || "؟").charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-black sm:text-2xl">
                {child.first_name} {child.second_name} {child.third_name} {child.last_name}
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-white/15 px-3 py-1">المستوى: {child.school_level || "غير محدد"}</span>
                {Number(stats.totalPoints) > 0 && (
                  <span className="rounded-full bg-amber-400/90 px-3 py-1 text-amber-950">🏆 {stats.totalPoints} نقطة</span>
                )}
                {certificates.length > 0 && (
                  <span className="rounded-full bg-white/15 px-3 py-1">🏅 {certificates.length} شهادة</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StudentCertificatesButton studentId={studentId} />
            {!isStudentView && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/25"
              >
                رجوع للأبناء
              </button>
            )}
          </div>
        </div>
        <FaUserGraduate className="pointer-events-none absolute -bottom-6 left-4 text-[110px] text-white/10" />
      </div>

      {/* شريط الفصول */}
      {semesters.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {semesters.map((semester) => {
              const isActive = active?.id === semester.id;
              const needsRegistration = semester.registrationOpen && !semester.isRegistered;
              return (
                <button
                  key={semester.id}
                  type="button"
                  onClick={() => {
                    setActiveSemesterId(semester.id);
                    setActiveTab("grades");
                  }}
                  className={`shrink-0 rounded-xl border px-4 py-2 text-right transition ${
                    isActive
                      ? "border-teal-600 bg-teal-600 text-white shadow"
                      : needsRegistration
                        ? "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-500"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-400"
                  }`}
                >
                  <span className="block text-sm font-black">{semester.label}</span>
                  <span className={`mt-0.5 block text-[11px] font-semibold ${isActive ? "text-white/85" : "text-slate-500"}`}>
                    {needsRegistration
                      ? "✦ التسجيل متاح الآن"
                      : semester.certificate
                        ? "🏅 شهادة ممنوحة"
                        : semester.registeredClassName || (semester.hasGrades ? `${semester.gradesCount} درجة` : "غير مسجل")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* لوحة الفصل المحدد */}
      {active && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-lg font-black text-slate-900">{active.label}</h4>
              <p className="text-sm text-slate-500">
                {active.classNames?.length ? `الحلقة: ${active.classNames.join("، ")}` : active.schoolName || ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                active.registeredClassName
                  ? "bg-emerald-100 text-emerald-800"
                  : active.registrationStatus
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
              }`}>
                {statusText}
              </span>
              {active.certificate ? (
                <button
                  type="button"
                  onClick={() => setPreviewCertificate(active.certificate)}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-amber-500 to-amber-400 px-4 py-1.5 text-sm font-black text-amber-950 shadow hover:from-amber-600 hover:to-amber-500"
                >
                  <FaAward /> عرض شهادة الفصل
                </button>
              ) : (
                active.isRegistered && (
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-400">لا شهادة لهذا الفصل</span>
                )
              )}
            </div>
          </div>

          {/* فصل متاح للتسجيل ولم يسجل */}
          {active.registrationOpen && !active.isRegistered && (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/60 p-6 text-center">
              <FaCalendarAlt className="text-3xl text-teal-600" />
              <p className="font-bold text-teal-900">التسجيل متاح في هذا الفصل</p>
              <button
                type="button"
                disabled={registeringSemesterId === active.option?.id}
                onClick={() => active.option && onOpenRegistration?.(active.option)}
                className="rounded-lg bg-teal-600 px-6 py-2.5 font-black text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {registeringSemesterId === active.option?.id ? "جاري التسجيل..." : "تسجيل الطالب في هذا الفصل"}
              </button>
            </div>
          )}

          {active.isRegistered && (
            <>
              {/* البطاقات الإحصائية */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">متوسط الدرجات</p>
                  <p className={`mt-1 text-2xl font-black ${tone.text}`}>{active.average.toFixed(1)}%</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${tone.bar}`} style={{ width: `${Math.min(active.average, 100)}%` }} />
                  </div>
                </div>
                <StatTile label="عدد الدرجات" value={active.gradesCount} icon={<FaGraduationCap />} />
                <StatTile
                  label="نسبة الحضور"
                  value={
                    attendanceLoadingSemesterId === active.id
                      ? "..."
                      : attendanceRate !== undefined
                        ? `${Number(attendanceRate).toFixed(0)}%`
                        : "—"
                  }
                  sub={
                    attendance?.statistics?.present_days != null
                      ? `حضور ${attendance.statistics.present_days} · غياب ${attendance.statistics.absent_days ?? 0}`
                      : undefined
                  }
                  tone={Number(attendanceRate) >= 75 ? "text-emerald-700" : "text-slate-800"}
                  icon={<FaCalendarAlt />}
                />
                <StatTile
                  label="هدف الفصل"
                  value={
                    activeGoal?.target_surah_id
                      ? `سورة ${getSurahNameFromId(activeGoal.target_surah_id) || activeGoal.target_surah_id}`
                      : "لم يُحدد"
                  }
                  sub={activeGoal?.target_ayah_number ? `حتى الآية ${activeGoal.target_ayah_number}` : undefined}
                  tone="text-teal-700"
                  icon={<FaBullseye />}
                />
              </div>

              {/* التبويبات */}
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1.5 sm:grid-cols-6">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 transition sm:flex-row sm:justify-center sm:gap-2 ${
                      activeTab === tab.id
                        ? "bg-white text-teal-700 shadow font-black"
                        : "text-slate-500 hover:bg-white/60 hover:text-slate-800 font-bold"
                    }`}
                  >
                    <span className="text-2xl">{tab.icon}</span>
                    <span className="text-xs sm:text-base">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* الدرجات — مجمعة بالمقررات */}
              {activeTab === "grades" &&
                (courseGroups.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">لا توجد درجات مسجلة في هذا الفصل بعد</p>
                ) : (
                  <div className="space-y-3">
                    {courseGroups.map((course) => {
                      const cTone = scoreTone(course.average);
                      const open = expandedCourses.has(course.name);
                      return (
                        <div key={course.name} className="overflow-hidden rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => toggleCourse(course.name)}
                            className="flex w-full items-center gap-4 bg-white p-4 text-right hover:bg-slate-50"
                          >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cTone.soft} ${cTone.text}`}>
                              <FaBook />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-slate-900">{course.name}</span>
                                {course.weight != null && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                                    الوزن {course.weight}%
                                  </span>
                                )}
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                                  {course.grades.length} درجة
                                </span>
                              </div>
                              <div className="mt-2 flex items-center gap-3">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                  <div className={`h-full ${cTone.bar}`} style={{ width: `${Math.min(course.average, 100)}%` }} />
                                </div>
                                <span className={`text-sm font-black ${cTone.text}`}>{course.average.toFixed(1)}%</span>
                              </div>
                            </div>
                            <FaChevronDown className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                          </button>
                          {open && (
                            <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/60">
                              {course.sorted.map((grade, index) => {
                                const percent = gradePercentOf(grade);
                                const gTone = scoreTone(percent ?? 0);
                                return (
                                  <div key={index} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                    <span className="w-24 shrink-0 text-xs text-slate-500">
                                      {dateLabel(grade.date || grade.date_graded || grade.created_at)}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-slate-700">{surahRangeLabel(grade)}</span>
                                    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black ${gTone.soft} ${gTone.text}`}>
                                      {gradeValueOf(grade) ?? "-"}
                                      {grade.max_grade ? ` / ${grade.max_grade}` : "%"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

              {/* المسيرة */}
              {activeTab === "journey" &&
                (active.grades.length > 0 ? (
                  <QuranBlocksGrid blocksData={calculateQuranBlocks(child, active.grades)} />
                ) : (
                  <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">لا توجد مسيرة مسجلة في هذا الفصل</p>
                ))}

              {/* الحضور */}
              {activeTab === "attendance" &&
                (attendanceLoadingSemesterId === active.id ? (
                  <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">جاري تحميل الحضور...</p>
                ) : !attendance || !(attendance.days || []).length ? (
                  <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">لا توجد سجلات حضور لهذا الفصل</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(ATTENDANCE_STATUS).map(([key, cfg]) => (
                        <span key={key} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600">
                          <span className={`h-3 w-3 rounded-full ${cfg.dot}`} /> {cfg.label}
                        </span>
                      ))}
                    </div>
                    {/* بلاطة لكل يوم: التاريخ ظاهر داخلها والحالة بلونها */}
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                      {[...(attendance.days || [])]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((day, index) => {
                          const cfg = ATTENDANCE_STATUS[day.status] || DEFAULT_ATTENDANCE_TILE;
                          const d = new Date(day.date);
                          const valid = !Number.isNaN(d.getTime());
                          return (
                            <div
                              key={index}
                              title={`${dateLabel(day.date)} — ${cfg.label}`}
                              className={`flex flex-col items-center justify-center rounded-xl border-2 px-2 py-2.5 text-center ${cfg.tile}`}
                            >
                              <span className="text-xl font-black leading-none">
                                {valid ? d.toLocaleDateString("ar-SA", { day: "numeric" }) : "؟"}
                              </span>
                              <span className="mt-1 text-[11px] font-bold opacity-80">
                                {valid ? d.toLocaleDateString("ar-SA", { month: "short" }) : "-"}
                              </span>
                              <span className="mt-1 text-[11px] font-black">{cfg.label}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}

              {/* الهدف */}
              {activeTab === "goal" &&
                (activeGoal ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-5">
                      <p className="text-sm font-bold text-teal-700">هدف هذا الفصل</p>
                      <p className="mt-2 text-xl font-black text-teal-900">
                        {activeGoal.target_surah_id
                          ? `سورة ${getSurahNameFromId(activeGoal.target_surah_id) || "-"}${
                              activeGoal.target_ayah_number ? ` حتى الآية ${activeGoal.target_ayah_number}` : ""
                            }`
                          : "لم يُحدد هدف"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                      <p className="text-sm font-bold text-slate-600">المحفوظ السابق عند تحديد الهدف</p>
                      <p className="mt-2 text-xl font-black text-slate-800">
                        {activeGoal.memorized_surah_id
                          ? `سورة ${getSurahNameFromId(activeGoal.memorized_surah_id) || "-"}${
                              activeGoal.memorized_ayah_number ? ` — الآية ${activeGoal.memorized_ayah_number}` : ""
                            }`
                          : "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">لم يُحدد هدف لهذا الفصل بعد</p>
                ))}

              {/* المرحليات */}
              {activeTab === "stages" &&
                (!stageInfo ? (
                  <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">جاري تحميل المرحليات...</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-teal-50 px-3 py-1.5 text-sm font-bold text-teal-800">
                        المحفوظ: {stageInfo.juz_completed} جزء
                      </span>
                      {stageInfo.next_stage && (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-900">
                          🔔 جاهز لدخول {stageInfo.next_stage_label}
                        </span>
                      )}
                    </div>
                    {(stageInfo.stage_exams || []).length === 0 ? (
                      <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">
                        لم يدخل أي مرحلية بعد — كل جزءين محفوظين يؤهلان لمرحلية (الأولى: جزء 30+29)
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {stageInfo.stage_exams.map((exam) => (
                          <div
                            key={exam.id}
                            className={`rounded-xl border-2 p-4 ${
                              exam.status === "passed"
                                ? "border-emerald-200 bg-emerald-50/60"
                                : exam.status === "retry"
                                  ? "border-red-200 bg-red-50/60"
                                  : "border-sky-200 bg-sky-50/60"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-black text-slate-900">{exam.stage_label}</p>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                exam.status === "passed"
                                  ? "bg-emerald-600 text-white"
                                  : exam.status === "retry"
                                    ? "bg-red-600 text-white"
                                    : "bg-sky-600 text-white"
                              }`}>
                                {exam.status === "passed" ? "نجح 🎉" : exam.status === "retry" ? "تحتاج إعادة" : "في القائمة"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{exam.juz_label}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              {exam.score != null && <span>الدرجة: <b>{Number(exam.score)}%</b></span>}
                              <span>المحاولات: {exam.attempts}</span>
                              {exam.evaluated_at && <span>{dateLabel(exam.evaluated_at)}</span>}
                            </div>
                            {exam.notes && <p className="mt-2 text-xs text-slate-600">📝 {exam.notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

              {/* النقاط */}
              {activeTab === "points" &&
                ((childData?.points || []).length ? (
                  <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                    {(childData.points || []).slice(0, 30).map((point, index) => (
                      <div key={index} className="flex items-center gap-3 bg-white px-4 py-3 text-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 font-black text-amber-600">
                          {point.points ?? point.points_value ?? point.value ?? "-"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-slate-700">
                          {point.reason || point.description || point.note || "نقاط"}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {dateLabel(point.date || point.date_awarded || point.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">لا توجد نقاط مسجلة</p>
                ))}
            </>
          )}
        </div>
      )}

      {semesters.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          لا توجد فصول دراسية للعرض حالياً
        </div>
      )}

      <CertificatePreviewModal certificate={previewCertificate} onClose={() => setPreviewCertificate(null)} />
    </div>
  );
}
