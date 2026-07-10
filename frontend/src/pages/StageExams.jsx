import { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosConfig";
import {
  FaBell,
  FaCheckCircle,
  FaHistory,
  FaLayerGroup,
  FaPlus,
  FaRedoAlt,
  FaSearch,
  FaSyncAlt,
} from "react-icons/fa";

// نظام المرحليات: كل جزءين محفوظين يؤهلان الطالب لمرحلية.
// المعلم يضيف الجاهزين للقائمة، ويقيّم: نجح 🎉 أو تحتاج إعادة.

const STATUS_CONFIG = {
  pending: { label: "في القائمة", cls: "bg-sky-100 text-sky-800" },
  passed: { label: "نجح", cls: "bg-emerald-100 text-emerald-800" },
  retry: { label: "تحتاج إعادة", cls: "bg-red-100 text-red-700" },
};

export default function StageExams() {
  const [ready, setReady] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [evaluating, setEvaluating] = useState(null); // { exam, status }
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [readyRes, listRes] = await Promise.all([
        axios.get("/api/stage-exams/ready"),
        axios.get("/api/stage-exams"),
      ]);
      setReady(readyRes.data.ready || []);
      setExams(listRes.data.stage_exams || []);
    } catch (err) {
      setError(err.response?.data?.error || "فشل تحميل المرحليات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addToStage = async (student) => {
    if (!student.next_stage) return;
    try {
      setActionId(student.student_id);
      setError("");
      await axios.post("/api/stage-exams", {
        student_id: student.student_id,
        stage_number: student.next_stage,
      });
      setMessage(`أُضيف ${student.student_name} إلى ${student.next_stage_label}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "فشل إضافة الطالب");
    } finally {
      setActionId(null);
    }
  };

  const submitEvaluation = async () => {
    if (!evaluating) return;
    try {
      setActionId(evaluating.exam.id);
      setError("");
      await axios.patch(`/api/stage-exams/${evaluating.exam.id}`, {
        status: evaluating.status,
        score: score === "" ? null : Number(score),
        notes: notes || null,
      });
      setMessage(
        evaluating.status === "passed"
          ? `🎉 ${evaluating.exam.student_name} اجتاز ${evaluating.exam.stage_label}`
          : `سُجلت ${evaluating.exam.stage_label} لـ${evaluating.exam.student_name} كتحتاج إعادة`
      );
      setEvaluating(null);
      setScore("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "فشل حفظ التقييم");
    } finally {
      setActionId(null);
    }
  };

  const reEnter = async (exam) => {
    try {
      setActionId(exam.id);
      await axios.post("/api/stage-exams", {
        student_id: exam.student_id,
        stage_number: exam.stage_number,
      });
      setMessage(`أُعيد إدخال ${exam.student_name} في ${exam.stage_label} (محاولة ${Number(exam.attempts) + 1})`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "فشل إعادة الإدخال");
    } finally {
      setActionId(null);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim();
    const bySearch = term
      ? exams.filter(
          (e) =>
            e.student_name?.includes(term) ||
            String(e.student_id).includes(term) ||
            e.class_name?.includes(term)
        )
      : exams;
    return showHistory ? bySearch : bySearch.filter((e) => e.status === "pending" || e.status === "retry");
  }, [exams, search, showHistory]);

  const pendingCount = exams.filter((e) => e.status === "pending").length;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* العنوان */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-2xl text-teal-700">
                <FaLayerGroup />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">المرحليات</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  كل جزءين محفوظين = مرحلية · المرحلية 1 (جزء 30+29) ثم 2 (جزء 28+27) وهكذا
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              <FaSyncAlt /> تحديث
            </button>
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}
        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">{message}</div>}

        {/* الجاهزون لدخول مرحلية */}
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FaBell className="text-xl text-amber-500" />
            <h2 className="text-lg font-black text-amber-900">جاهزون لدخول مرحلية ({ready.length})</h2>
          </div>
          {loading ? (
            <p className="p-4 text-center text-slate-500">جاري التحميل...</p>
          ) : ready.length === 0 ? (
            <p className="rounded-xl bg-white/70 p-5 text-center text-sm text-slate-500">
              لا يوجد طلاب جاهزون حالياً — يظهر الطالب هنا تلقائياً متى أكمل جزءين من خطة الحفظ
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ready.map((student) => (
                <div key={student.student_id} className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
                  <p className="font-black text-slate-900">{student.student_name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{student.class_name} · محفوظه {student.juz_completed} جزء</p>
                  <p className="mt-2 text-sm font-bold text-teal-700">{student.next_stage_label}</p>
                  <button
                    type="button"
                    disabled={actionId === student.student_id}
                    onClick={() => addToStage(student)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-black text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    <FaPlus /> إضافة للمرحلية
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* قائمة المرحليات */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-black text-slate-900">
              قائمة المرحليات
              {pendingCount > 0 && (
                <span className="mr-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-800">{pendingCount} بانتظار الاختبار</span>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <FaSearch className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الهوية أو الحلقة"
                  className="w-64 rounded-lg border border-slate-300 py-2 pl-3 pr-9 text-sm outline-none focus:border-teal-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${
                  showHistory ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FaHistory /> {showHistory ? "إخفاء السجل" : "عرض السجل الكامل"}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="p-8 text-center text-slate-500">جاري التحميل...</p>
          ) : filtered.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">
              {showHistory ? "لا توجد مرحليات" : "لا توجد مرحليات بانتظار الاختبار — أضف الجاهزين من الأعلى"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-right">الطالب</th>
                    <th className="px-4 py-3 text-right">المرحلية</th>
                    <th className="px-4 py-3 text-center">المحاولة</th>
                    <th className="px-4 py-3 text-center">الحالة</th>
                    <th className="px-4 py-3 text-center">الدرجة</th>
                    <th className="px-4 py-3 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((exam) => {
                    const cfg = STATUS_CONFIG[exam.status] || STATUS_CONFIG.pending;
                    return (
                      <tr key={exam.id} className={exam.status === "retry" ? "bg-red-50/40" : ""}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{exam.student_name}</p>
                          <p className="text-xs text-slate-500">{exam.class_name || exam.student_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-black text-teal-700">{exam.stage_label}</p>
                          <p className="text-xs text-slate-500">{exam.juz_label}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{exam.attempts}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${cfg.cls}`}>{cfg.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">
                          {exam.score != null ? `${Number(exam.score)}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {exam.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  disabled={actionId === exam.id}
                                  onClick={() => { setEvaluating({ exam, status: "passed" }); setScore(""); setNotes(""); }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700"
                                >
                                  <FaCheckCircle /> نجح
                                </button>
                                <button
                                  type="button"
                                  disabled={actionId === exam.id}
                                  onClick={() => { setEvaluating({ exam, status: "retry" }); setScore(""); setNotes(""); }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-black text-white hover:bg-red-700"
                                >
                                  <FaRedoAlt /> تحتاج إعادة
                                </button>
                              </>
                            )}
                            {exam.status === "retry" && (
                              <button
                                type="button"
                                disabled={actionId === exam.id}
                                onClick={() => reEnter(exam)}
                                className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-black text-white hover:bg-sky-700"
                              >
                                <FaRedoAlt /> إعادة إدخال
                              </button>
                            )}
                            {exam.notes && <span className="text-xs text-slate-400" title={exam.notes}>📝</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* نافذة التقييم */}
      {evaluating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">
              {evaluating.status === "passed" ? "تسجيل اجتياز 🎉" : "تسجيل: تحتاج إعادة"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {evaluating.exam.student_name} — {evaluating.exam.stage_label} ({evaluating.exam.juz_label})
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">الدرجة % (اختياري)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">ملاحظات (اختياري)</span>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEvaluating(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={submitEvaluation}
                disabled={actionId === evaluating.exam.id}
                className={`rounded-lg px-5 py-2 text-sm font-black text-white disabled:opacity-50 ${
                  evaluating.status === "passed" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
