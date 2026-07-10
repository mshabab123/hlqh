import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../utils/axiosConfig";
import { AiOutlineBarChart, AiOutlineSend, AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineMail } from "react-icons/ai";

// صفحة مستقلة لإدارة التقارير الدورية عن الطلاب (تعتمد على إعدادات البريد نفسها).
export default function StudentReports() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/settings/email");
      setSettings(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (patch) => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const res = await axios.put("/api/settings/email", patch);
      setSettings(res.data);
      setMessage("تم حفظ الإعدادات");
    } catch (err) {
      setError(err.response?.data?.error || "فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    try {
      setSending(true);
      setError("");
      setMessage("");
      const res = await axios.post("/api/settings/email/send-reports-now");
      setMessage(res.data?.message || "تم إرسال التقارير");
    } catch (err) {
      setError(err.response?.data?.error || "تعذر إرسال التقارير");
    } finally {
      setSending(false);
    }
  };

  const Toggle = ({ on, onChange, disabled }) => (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled || saving}
      className={`relative h-7 rounded-full transition-colors ${on ? "bg-teal-600" : "bg-slate-300"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{ width: "3.25rem" }}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-1" : "right-1"}`} />
    </button>
  );

  const masterOff = settings && !settings.email_service_enabled;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <AiOutlineBarChart className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">التقارير الدورية عن الطلاب</h1>
              <p className="mt-1 text-sm text-slate-500">
                إرسال تقرير تلقائي لولي الأمر (أو الطالب) يلخّص الحضور والدرجات والنقاط — يومياً أو أسبوعياً.
              </p>
            </div>
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
        {message && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">{message}</div>}

        {loading || !settings ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">جاري التحميل...</div>
        ) : (
          <>
            {/* حالة خدمة البريد */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-bold ${settings.service_ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {settings.service_ready ? <AiOutlineCheckCircle /> : <AiOutlineCloseCircle />}
                  {settings.service_ready ? "خدمة البريد جاهزة" : "خدمة البريد متوقفة"}
                </span>
                <Link to="/email-settings" className="inline-flex items-center gap-1 text-teal-700 font-bold hover:underline">
                  <AiOutlineMail /> إعدادات البريد
                </Link>
              </div>
              {masterOff && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  المفتاح الرئيسي لخدمة البريد متوقف. فعّله من <Link to="/email-settings" className="font-bold underline">إعدادات البريد</Link> أولاً حتى تعمل التقارير.
                </p>
              )}
            </div>

            {/* الإعدادات */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900">تفعيل التقارير الدورية</p>
                  <p className="mt-1 text-sm text-slate-500">إرسال تلقائي مجدول حسب التكرار المحدد.</p>
                </div>
                <Toggle
                  on={settings.email_reports_enabled}
                  disabled={masterOff}
                  onChange={(v) => update({ email_reports_enabled: v })}
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-900">التكرار</p>
                  <p className="mt-1 text-sm text-slate-500">يُرسل مساءً بعد تجميع بيانات اليوم/الأسبوع.</p>
                </div>
                <select
                  value={settings.email_reports_frequency}
                  onChange={(e) => update({ email_reports_frequency: e.target.value })}
                  disabled={saving || masterOff}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                </select>
              </div>
            </div>

            {/* إرسال فوري */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-2 font-bold text-slate-800">إرسال فوري</h3>
              <p className="mb-3 text-sm text-slate-500">
                يُرسل تقريراً الآن لكل طالب لديه نشاط في الفترة الحالية — بصرف النظر عن الموعد المجدول.
              </p>
              <button
                type="button"
                onClick={sendNow}
                disabled={sending || !settings.service_ready}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-5 py-2.5 font-bold text-white hover:bg-slate-900 disabled:opacity-50"
              >
                <AiOutlineSend /> {sending ? "جاري الإرسال..." : "إرسال التقارير الآن"}
              </button>
            </div>

            {/* التحكم في محتوى التقرير */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-1 font-bold text-slate-800">محتوى التقرير</h3>
              <p className="mb-4 text-sm text-slate-500">اختر المعلومات التي تظهر في التقرير المُرسَل.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(settings.report_field_catalog || []).map((field) => {
                  const checked = settings.email_report_fields?.[field.key] ?? false;
                  return (
                    <label
                      key={field.key}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                        checked ? "border-teal-300 bg-teal-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
                      } ${masterOff ? "opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving || masterOff}
                        onChange={(e) =>
                          update({
                            email_report_fields: {
                              ...settings.email_report_fields,
                              [field.key]: e.target.checked,
                            },
                          })
                        }
                        className="h-5 w-5 accent-teal-600"
                      />
                      <span className="font-semibold text-slate-800">{field.label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                لا يُرسَل تقرير للطالب الذي لا يوجد له أي نشاط خلال الفترة، حتى لو فُعّلت الحقول.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
