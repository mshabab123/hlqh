import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { AiOutlineMail, AiOutlineUser, AiOutlineArrowRight, AiOutlineCheck, AiOutlineWarning } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [resetToken, setResetToken] = useState(""); // For development only

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/api/forgot-password/request`, {
        identifier: identifier.trim()
      });

      setSuccess(true);
      
      // In development, show the reset token (remove in production)
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken);
      }
      
    } catch (err) {
      if (err.response?.data?.details) {
        setError(err.response.data.details[0]?.msg || "خطأ في البيانات المدخلة");
      } else {
        setError(err.response?.data?.error || "فشل في إرسال رابط إعادة تعيين كلمة المرور");
      }
    } finally {
      setLoading(false);
    }
  };

  const isEmail = identifier.includes('@');
  const isID = /^[0-9]{10}$/.test(identifier);
  const isValid = isEmail || isID;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-primary-100)] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-800)] p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AiOutlineMail className="text-3xl text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">استعادة كلمة المرور</h1>
          <p className="text-white/90 text-sm">أدخل بريدك الإلكتروني أو رقم هويتك</p>
        </div>

        <div className="p-4 sm:p-8">
          {!success ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني أو رقم الهوية
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full p-4 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent"
                      placeholder="example@email.com أو 1234567890"
                      required
                    />
                    <div className="absolute right-4 top-4 text-gray-400">
                      {isEmail ? <AiOutlineMail /> : <AiOutlineUser />}
                    </div>
                  </div>
                  
                  {identifier && !isValid && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AiOutlineWarning />
                      يرجى إدخال بريد إلكتروني صحيح أو رقم هوية (10 أرقام)
                    </p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <AiOutlineWarning />
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-700)] text-white py-4 rounded-lg font-semibold hover:from-[var(--color-primary-700)] hover:to-[var(--color-primary-800)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02]"
                >
                  {loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-gray-600 text-sm mb-4">تذكرت كلمة المرور؟</p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] font-medium text-sm transition-colors"
                >
                  <AiOutlineArrowRight />
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AiOutlineCheck className="text-3xl text-green-600" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">تم إرسال الرابط</h2>
              <p className="text-gray-600 mb-6">
                إذا كان الحساب موجود، فقد تم إرسال رابط إعادة تعيين كلمة المرور.
              </p>
              
              {/* Development only - show reset link */}
              {resetToken && process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800 text-sm font-medium mb-2">وضع التطوير - رابط الاستعادة:</p>
                  <Link
                    to={`/reset-password?token=${resetToken}`}
                    className="inline-block bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                  >
                    إعادة تعيين كلمة المرور
                  </Link>
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  <strong>نصائح:</strong>
                  <br />
                  • تحقق من صندوق البريد الوارد والرسائل المهملة
                  <br />
                  • الرابط صالح لمدة 30 دقيقة فقط
                  <br />
                  • إذا لم تتلق الرسالة، تأكد من صحة البيانات المدخلة
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setIdentifier("");
                    setError("");
                    setResetToken("");
                  }}
                  className="w-full bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  إرسال رابط جديد
                </button>
                
                <Link
                  to="/login"
                  className="block w-full text-center py-3 text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] font-medium transition-colors"
                >
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}