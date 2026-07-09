import { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosConfig";
import {
  FaAward,
  FaBan,
  FaCheckCircle,
  FaPrint,
  FaSearch,
  FaSyncAlt,
  FaUserGraduate,
} from "react-icons/fa";
import CertificatePreviewModal from "../components/CertificatePreviewModal";

const getSemesterName = (semester) => {
  if (!semester) return "";
  return semester.display_name || semester.semester_name || `الفصل ${semester.type || ""} ${semester.year || ""}`.trim();
};

const getStudentCertificatePayload = (student, semester) => ({
  certificate_number: student.certificate_number,
  student_name: student.student_name,
  student_id: student.student_id,
  school_level: student.school_level,
  school_name: student.school_name || semester?.school_name,
  class_name: student.class_name,
  teacher_name: student.teacher_name,
  semester_name: student.semester_name || getSemesterName(semester),
  semester_year: student.semester_year || semester?.year,
  average_grade: Number(student.average_grade || 0),
  grade_count: Number(student.grade_count || 0),
  issued_at: student.issued_at,
});

export default function CertificateManagement() {
  const [schools, setSchools] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewCertificate, setPreviewCertificate] = useState(null);
  const [passThreshold, setPassThreshold] = useState(50);
  const [savingThreshold, setSavingThreshold] = useState(false);

  useEffect(() => {
    let mounted = true;

    axios
      .get("/api/schools")
      .then((response) => {
        if (!mounted) return;
        const list = response.data.schools || response.data || [];
        setSchools(list);
        if (list.length === 1) setSelectedSchool(list[0].id);
      })
      .catch(() => setError("فشل تحميل مجمعات الحلقات"));

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSchool) {
      setSemesters([]);
      setSelectedSemester("");
      return;
    }

    setLoading(true);
    axios
      .get(`/api/semesters?school_id=${selectedSchool}`)
      .then((response) => {
        const list = response.data.semesters || response.data || [];
        setSemesters(list);
        setSelectedSemester(list[0]?.id ? String(list[0].id) : "");
      })
      .catch(() => setError("فشل تحميل الفصول الدراسية"))
      .finally(() => setLoading(false));
  }, [selectedSchool]);

  const fetchStudents = async () => {
    if (!selectedSemester) {
      setStudents([]);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await axios.get(`/api/certificates/semesters/${selectedSemester}/students`);
      const list = response.data.students || [];
      setStudents(list);
      if (response.data.pass_threshold !== undefined && response.data.pass_threshold !== null) {
        setPassThreshold(Number(response.data.pass_threshold));
      }
      // الافتراضي: لا مَنح لمن أزيل من حلقته — كل مُزال بلا شهادة سارية
      // مستثنى تلقائياً، ومنحه قرار صريح يتخذه المدير لكل طالب على حدة.
      setExcludedIds(
        new Set(
          list
            .filter((s) => s.has_active_enrollment === false && s.certificate_status !== "issued")
            .map((s) => String(s.student_id))
        )
      );
    } catch (err) {
      setError(err.response?.data?.error || "فشل تحميل طلاب الفصل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemester]);

  const selectedSemesterData = useMemo(
    () => semesters.find((semester) => String(semester.id) === String(selectedSemester)),
    [semesters, selectedSemester]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim();
    const list = !term
      ? students
      : students.filter((student) => {
          return (
            student.student_name?.includes(term) ||
            String(student.student_id || "").includes(term) ||
            student.class_name?.includes(term)
          );
        });

    // الطلاب الذين أزيلوا من حلقاتهم (بلا شهادة) يُعرضون جميعاً في آخر القائمة.
    const isRemovedNoCert = (s) => s.has_active_enrollment === false && s.certificate_status !== "issued";
    return [...list].sort((a, b) => Number(isRemovedNoCert(a)) - Number(isRemovedNoCert(b)));
  }, [students, search]);

  const isPassing = (student) =>
    Number(student.grade_count || 0) > 0 && Number(student.average_grade || 0) >= Number(passThreshold || 0);

  const eligibleCount = students.filter(
    (student) => isPassing(student) && !excludedIds.has(String(student.student_id))
  ).length;

  const savePassThreshold = async () => {
    setSavingThreshold(true);
    setError("");
    setMessage("");
    try {
      const response = await axios.put(`/api/certificates/settings/pass-threshold`, {
        pass_threshold: Number(passThreshold),
      });
      setPassThreshold(Number(response.data.pass_threshold));
      setMessage("تم حفظ درجة النجاح");
    } catch (err) {
      setError(err.response?.data?.error || "فشل حفظ درجة النجاح");
    } finally {
      setSavingThreshold(false);
    }
  };

  const toggleExclude = (studentId) => {
    setExcludedIds((current) => {
      const next = new Set(current);
      const key = String(studentId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const grantCertificates = async () => {
    if (!selectedSemester) return;

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      // المُزالون من حلقاتهم لا يمنحهم الخادم إلا إذا وردت هوياتهم صراحةً هنا
      // (وهم الذين فعّل المدير خيار منحهم في القائمة).
      const includeRemoved = students
        .filter(
          (s) =>
            s.has_active_enrollment === false &&
            !excludedIds.has(String(s.student_id))
        )
        .map((s) => String(s.student_id));

      const response = await axios.post(`/api/certificates/semesters/${selectedSemester}/grant`, {
        excluded_student_ids: Array.from(excludedIds),
        include_removed_student_ids: includeRemoved,
        pass_threshold: Number(passThreshold),
      });
      setMessage(`تم منح ${response.data.issued_count || 0} شهادة`);
      await fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error || "فشل منح الشهادات");
    } finally {
      setActionLoading(false);
    }
  };

  const revokeCertificate = async (student) => {
    if (!student.certificate_id) return;
    const reason = window.prompt("سبب إلغاء الشهادة (اختياري):") || "";

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await axios.patch(`/api/certificates/${student.certificate_id}/revoke`, { reason });
      setMessage("تم إلغاء الشهادة");
      await fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error || "فشل إلغاء الشهادة");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8 font-[var(--font-family-arabic)]">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">إدارة الشهادات</h1>
              <p className="mt-1 text-sm text-slate-500">منح وإلغاء وطباعة شهادات الطلاب حسب الفصل الدراسي والدرجات المسجلة.</p>
            </div>
            <button
              type="button"
              onClick={fetchStudents}
              disabled={!selectedSemester || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              <FaSyncAlt /> تحديث
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">مجمع الحلقات</span>
              <select
                value={selectedSchool}
                onChange={(event) => setSelectedSchool(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-500"
              >
                <option value="">اختر المجمع</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">الفصل الدراسي</span>
              <select
                value={selectedSemester}
                onChange={(event) => setSelectedSemester(event.target.value)}
                disabled={!selectedSchool}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-500 disabled:bg-slate-100"
              >
                <option value="">اختر الفصل</option>
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {getSemesterName(semester)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">البحث</span>
              <div className="relative">
                <FaSearch className="absolute right-3 top-3.5 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="اسم الطالب أو الهوية أو الحلقة"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-3 outline-none focus:border-teal-500"
                />
              </div>
            </label>
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="text-sm font-bold text-slate-700">درجة النجاح المطلوبة (%)</span>
              <p className="mt-1 text-xs text-slate-500">يحددها المدير أو الأدمن. لا تُمنح الشهادة إلا لمن بلغ متوسطه هذه النسبة فأعلى.</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passThreshold}
                  onChange={(event) => setPassThreshold(event.target.value)}
                  className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-500"
                />
                <span className="text-lg font-black text-slate-700">%</span>
              </div>
            </div>
            <button
              type="button"
              onClick={savePassThreshold}
              disabled={savingThreshold}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {savingThreshold ? "جاري الحفظ..." : "حفظ درجة النجاح"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-slate-500">الطلاب</p>
                <p className="text-xl font-black">{students.length}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-emerald-700">جاهزون للمنح</p>
                <p className="text-xl font-black text-emerald-800">{eligibleCount}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-amber-700">مستثنون</p>
                <p className="text-xl font-black text-amber-800">{excludedIds.size}</p>
              </div>
              <div className="rounded-lg bg-teal-50 p-3">
                <p className="text-teal-700">ممنوحة</p>
                <p className="text-xl font-black text-teal-800">{students.filter((student) => student.certificate_status === "issued").length}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={grantCertificates}
              disabled={!selectedSemester || actionLoading || eligibleCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-3 font-black text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <FaAward /> منح شهادات الفصل
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {loading ? (
            <div className="col-span-full rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">جاري التحميل...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="col-span-full rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">لا توجد بيانات طلاب لهذا الفصل</div>
          ) : (
            filteredStudents.map((student) => {
              const issued = student.certificate_status === "issued";
              const revoked = student.certificate_status === "revoked";
              const noGrades = Number(student.grade_count || 0) === 0;
              const excluded = excludedIds.has(String(student.student_id));
              const passing = isPassing(student);
              const failed = !noGrades && !passing;
              // الطالب أزيل من حلقته في هذا الفصل (لا يوجد التحاق نشط)
              const removed = student.has_active_enrollment === false;

              return (
                <div
                  key={student.student_id}
                  className={`rounded-lg border p-5 shadow-sm ${
                    removed && !issued ? "border-red-300 bg-red-50/60" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-lg font-black ${removed && !issued ? "text-red-800" : "text-slate-900"}`}>
                          {student.student_name}
                        </h3>
                        {removed && <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">أزيل من الحلقة</span>}
                        {issued && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">شهادة ممنوحة</span>}
                        {revoked && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">ملغاة</span>}
                        {!student.certificate_status && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">بدون شهادة</span>}
                        {!issued && passing && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">مجتاز</span>}
                        {failed && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">لم يجتز</span>}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">رقم الهوية: {student.student_id}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {student.class_name || "بدون حلقة"} {student.teacher_name ? `- المعلم: ${student.teacher_name}` : ""}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                      <FaUserGraduate />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-slate-500">المستوى</p>
                      <p className="font-bold">{student.school_level || "-"}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-slate-500">المتوسط</p>
                      <p className="font-black text-teal-700">{Number(student.average_grade || 0).toFixed(1)}%</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-slate-500">الدرجات</p>
                      <p className="font-bold">{student.grade_count || 0}</p>
                    </div>
                  </div>

                  {noGrades && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-700">لا يمكن منح شهادة قبل تسجيل درجات للطالب.</p>}
                  {failed && !issued && (
                    <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                      متوسط الطالب ({Number(student.average_grade || 0).toFixed(1)}%) أقل من درجة النجاح ({Number(passThreshold || 0)}%)، لن تُمنح له شهادة.
                    </p>
                  )}
                  {removed && !issued && !noGrades && !failed && (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-100 p-3 text-sm font-bold text-red-800">
                      هذا الطالب أُزيل من حلقته في هذا الفصل — لن تُمنح له شهادة إلا إذا اخترت منحه صراحةً.
                    </p>
                  )}
                  {student.revoke_reason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">سبب الإلغاء: {student.revoke_reason}</p>}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {removed && !issued ? (
                      <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-black ${
                        excluded
                          ? "border-red-300 bg-white text-red-700"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800"
                      }`}>
                        <input
                          type="checkbox"
                          checked={!excluded}
                          onChange={() => toggleExclude(student.student_id)}
                          disabled={noGrades || failed}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        {excluded ? "منحه الشهادة رغم الإزالة؟" : "✓ سيُمنح الشهادة"}
                      </label>
                    ) : (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={excluded}
                        onChange={() => toggleExclude(student.student_id)}
                        disabled={issued || noGrades || failed}
                      />
                      استثناء من المنح
                    </label>
                    )}

                    {issued && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewCertificate(getStudentCertificatePayload(student, selectedSemesterData))}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          <FaPrint /> عرض وطباعة
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeCertificate(student)}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <FaBan /> إلغاء الشهادة
                        </button>
                      </>
                    )}

                    {revoked && (
                      <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
                        <FaCheckCircle /> يمكن إعادة منحها من زر منح شهادات الفصل
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <CertificatePreviewModal
        certificate={previewCertificate}
        onClose={() => setPreviewCertificate(null)}
      />
    </div>
  );
}
