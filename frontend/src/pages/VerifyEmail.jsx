import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineLoading3Quarters, AiOutlineMail } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("رابط التأكيد غير صحيح أو ناقص.");
      return;
    }
    axios
      .post(`${API_BASE}/api/email/verify`, { token })
      .then((res) => {
        setState("success");
        setMessage(res.data?.message || "تم تأكيد بريدك الإلكتروني بنجاح");
      })
      .catch((err) => {
        setState("error");
        setMessage(err.response?.data?.error || "رابط التأكيد غير صالح أو منتهي الصلاحية.");
      });
  }, [token]);

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <AiOutlineMail className="text-3xl" />
        </div>

        {state === "verifying" && (
          <>
            <AiOutlineLoading3Quarters className="mx-auto mb-3 animate-spin text-3xl text-teal-600" />
            <h1 className="text-xl font-black text-slate-900">جاري تأكيد بريدك الإلكتروني...</h1>
          </>
        )}

        {state === "success" && (
          <>
            <AiOutlineCheckCircle className="mx-auto mb-3 text-5xl text-emerald-500" />
            <h1 className="text-xl font-black text-slate-900">تم التأكيد بنجاح</h1>
            <p className="mt-2 text-slate-600">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-lg bg-teal-600 px-6 py-2.5 font-bold text-white hover:bg-teal-700"
            >
              الذهاب لتسجيل الدخول
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <AiOutlineCloseCircle className="mx-auto mb-3 text-5xl text-red-500" />
            <h1 className="text-xl font-black text-slate-900">تعذر تأكيد البريد</h1>
            <p className="mt-2 text-slate-600">{message}</p>
            <p className="mt-4 text-sm text-slate-500">
              يمكنك طلب رابط تأكيد جديد بعد تسجيل الدخول من صفحة الملف الشخصي.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-lg border border-slate-300 px-6 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
            >
              العودة لتسجيل الدخول
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
