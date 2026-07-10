import { useEffect, useState } from "react";
import axios from "../utils/axiosConfig";
import { AiOutlineMail, AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineSend } from "react-icons/ai";

// إعدادات خدمة البريد الإلكتروني (Resend) — المفتاح الرئيسي للإدارة:
// تفعيل/إيقاف إرسال الرسائل، واشتراط تأكيد البريد، واختبار الإرسال.
export default function EmailSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [sendingReports, setSendingReports] = useState(false);

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

  const sendTest = async () => {
    try {
      setTesting(true);
      setError("");
      setMessage("");
      const res = await axios.post("/api/settings/email/test", testTo ? { to: testTo } : {});
      setMessage(res.data?.message || "تم إرسال رسالة الاختبار");
    } catch (err) {
      setError(err.response?.data?.error || "تعذر إرسال رسالة الاختبار");
    } finally {
      setTesting(false);
    }
  };

  const sendReportsNow = async () => {
    try {
      setSendingReports(true);
      setError("");
      setMessage("");
      const res = await axios.post("/api/settings/email/send-reports-now");
      setMessage(res.data?.message || "تم إرسال التقارير");
    } catch (err) {
      setError(err.response?.data?.error || "تعذر إرسال التقارير");
    } finally {
      setSendingReports(false);
    }
  };

  const Toggle = ({ on, onChange, disabled }) => (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled || saving}
      className={`relative h-7 w-13 shrink-0 rounded-full transition-colors ${on ? "bg-teal-600" : "bg-slate-300"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{ width: "3.25rem" }}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-1" : "right-1"}`} />
    </button>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <AiOutlineMail className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">إعدادات البريد الإلكتروني</h1>
              <p className="mt-1 text-sm text-slate-500">
                التحكم في خدمة إرسال الرسائل (Resend): التأكيد عند التسجيل واستعادة كلمة المرور.
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
            {/* حالة الإعداد على الخادم */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-bold text-slate-800">حالة الخدمة على الخادم</h3>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-bold ${settings.resend_configured ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {settings.resend_configured ? <AiOutlineCheckCircle /> : <AiOutlineCloseCircle />}
                  {settings.resend_configured ? "مفتاح Resend مهيأ" : "مفتاح Resend غير موجود (RESEND_API_KEY)"}
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-bold ${settings.service_ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {settings.service_ready ? <AiOutlineCheckCircle /> : <AiOutlineCloseCircle />}
                  {settings.service_ready ? "الإرسال جاهز" : "الإرسال متوقف"}
                </span>
                {settings.from_address && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-slate-600" dir="ltr">
                    {settings.from_address}
                  </span>
                )}
              </div>
              {!settings.resend_configured && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  لتشغيل الإرسال فعلياً: أضف <code dir="ltr">RESEND_API_KEY</code> و<code dir="ltr">EMAIL_FROM</code> في ملف
                  <code dir="ltr"> backend/.env </code> ثم أعد تشغيل الخادم.
                </p>
              )}
            </div>

            {/* المفتاح الرئيسي */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900">المفتاح الرئيسي لخدمة البريد</p>
                  <p className="mt-1 text-sm text-slate-500">
                    عند إيقافه لا تُرسل أي رسائل إطلاقاً. كل نوع أدناه يُتحكم به بشكل مستقل.
                  </p>
                </div>
                <Toggle
                  on={settings.email_service_enabled}
                  disabled={!settings.resend_configured}
                  onChange={(v) => update({ email_service_enabled: v })}
                />
              </div>
            </div>

            {/* تأكيد البريد */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800">تأكيد البريد الإلكتروني (عند التسجيل)</h3>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900">إرسال رسائل التأكيد</p>
                  <p className="mt-1 text-sm text-slate-500">إرسال رابط تأكيد للمستخدمين الجدد.</p>
                </div>
                <Toggle
                  on={settings.email_verification_enabled}
                  disabled={!settings.email_service_enabled}
                  onChange={(v) => update({ email_verification_enabled: v })}
                />
              </div>
              <div className="border-t border-slate-100 pt-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900">اشتراط تأكيد البريد</p>
                  <p className="mt-1 text-sm text-slate-500">إلزام المستخدم بتأكيد بريده.</p>
                </div>
                <Toggle
                  on={settings.email_verification_required}
                  disabled={!settings.email_service_enabled}
                  onChange={(v) => update({ email_verification_required: v })}
                />
              </div>
            </div>

            {/* استعادة كلمة المرور */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900">استعادة كلمة المرور عبر البريد</p>
                  <p className="mt-1 text-sm text-slate-500">
                    إرسال رابط إعادة تعيين كلمة المرور عند طلب المستخدم ذلك. (مستقل عن التأكيد.)
                  </p>
                </div>
                <Toggle
                  on={settings.email_password_reset_enabled}
                  disabled={!settings.email_service_enabled}
                  onChange={(v) => update({ email_password_reset_enabled: v })}
                />
              </div>
            </div>

            {/* التقارير الدورية */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800">تقارير الطلاب الدورية</h3>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900">إرسال تقارير عن الطلاب</p>
                  <p className="mt-1 text-sm text-slate-500">
                    تقرير تلقائي لولي الأمر (أو الطالب) يلخّص الحضور والدرجات والنقاط.
                  </p>
                </div>
                <Toggle
                  on={settings.email_reports_enabled}
                  disabled={!settings.email_service_enabled}
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
                  disabled={saving || !settings.email_service_enabled}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                </select>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={sendReportsNow}
                  disabled={sendingReports || !settings.service_ready}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-5 py-2.5 font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  <AiOutlineSend /> {sendingReports ? "جاري الإرسال..." : "إرسال التقارير الآن (اختبار)"}
                </button>
                <p className="mt-2 text-xs text-slate-500">
                  يُرسل تقريراً فورياً لكل طالب لديه نشاط في الفترة الحالية — بصرف النظر عن التكرار المجدول.
                </p>
              </div>
            </div>

            {/* اختبار الإرسال */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-bold text-slate-800">اختبار الإرسال</h3>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  dir="ltr"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="بريدك الإلكتروني لاستقبال رسالة الاختبار"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={sendTest}
                  disabled={testing || !settings.service_ready}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  <AiOutlineSend /> {testing ? "جاري الإرسال..." : "إرسال رسالة اختبار"}
                </button>
              </div>
              {!settings.service_ready && (
                <p className="mt-2 text-xs text-slate-500">فعّل الخدمة أولاً لتتمكن من إرسال رسالة اختبار.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
