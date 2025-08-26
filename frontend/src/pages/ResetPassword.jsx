import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { AiOutlineLock, AiOutlineEye, AiOutlineEyeInvisible, AiOutlineCheck, AiOutlineWarning, AiOutlineLoading3Quarters } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (!token) {
      setError("رابط إعادة تعيين كلمة المرور غير صحيح");
      setVerifying(false);
      return;
    }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      setVerifying(true);
      const response = await axios.post(`${API_BASE}/api/forgot-password/verify-token`, {
        token
      });
      
      if (response.data.valid) {
        setTokenValid(true);
        setUserInfo(response.data.user);
      } else {
        setError("رابط إعادة تعيين كلمة المرور غير صحيح أو منتهي الصلاحية");
      }
    } catch (err) {
      setError(err.response?.data?.error || "رابط إعادة تعيين كلمة المرور غير صحيح أو منتهي الصلاحية");
    } finally {
      setVerifying(false);
    }
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 6) {
      errors.push("يجب أن تكون كلمة المرور 6 أحرف على الأقل");
    }
    if (!/(?=.*[a-zA-Z])/.test(password)) {
      errors.push("يجب أن تحتوي على حرف واحد على الأقل");
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push("يجب أن تحتوي على رقم واحد على الأقل");
    }
    return errors;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
    
    // Real-time validation
    const newValidationErrors = { ...validationErrors };
    
    if (field === 'newPassword') {
      const passwordErrors = validatePassword(value);
      if (passwordErrors.length > 0) {
        newValidationErrors.newPassword = passwordErrors;
      } else {
        delete newValidationErrors.newPassword;
      }
    }
    
    if (field === 'confirmPassword' || (field === 'newPassword' && formData.confirmPassword)) {
      const confirmValue = field === 'confirmPassword' ? value : formData.confirmPassword;
      const newValue = field === 'newPassword' ? value : formData.newPassword;
      
      if (confirmValue && newValue !== confirmValue) {
        newValidationErrors.confirmPassword = ["كلمات المرور غير متطابقة"];
      } else {
        delete newValidationErrors.confirmPassword;
      }
    }
    
    setValidationErrors(newValidationErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(`${API_BASE}/api/forgot-password/reset`, {
        token,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      });

      setSuccess(true);
    } catch (err) {
      if (err.response?.data?.details) {
        const serverErrors = {};
        err.response.data.details.forEach(detail => {
          const field = detail.path || detail.param;
          if (!serverErrors[field]) {
            serverErrors[field] = [];
          }
          serverErrors[field].push(detail.msg);
        });
        setValidationErrors(serverErrors);
      } else {
        setError(err.response?.data?.error || "فشل في إعادة تعيين كلمة المرور");
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.newPassword &&
      formData.confirmPassword &&
      formData.newPassword === formData.confirmPassword &&
      Object.keys(validationErrors).length === 0
    );
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-primary-100)] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <AiOutlineLoading3Quarters className="animate-spin text-4xl text-[var(--color-primary-500)] mx-auto mb-4" />
          <p className="text-gray-600">جاري التحقق من الرابط...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-primary-100)] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AiOutlineWarning className="text-3xl text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">رابط غير صحيح</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Link
              to="/forgot-password"
              className="block w-full bg-[var(--color-primary-600)] text-white py-3 rounded-lg hover:bg-[var(--color-primary-700)] transition-colors"
            >
              طلب رابط جديد
            </Link>
            <Link
              to="/login"
              className="block w-full text-center py-3 text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] transition-colors"
            >
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-primary-100)] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AiOutlineCheck className="text-3xl text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">تم تغيير كلمة المرور</h1>
          <p className="text-gray-600 mb-6">
            تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-[var(--color-primary-600)] text-white py-3 rounded-lg hover:bg-[var(--color-primary-700)] transition-colors"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-primary-100)] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-800)] p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AiOutlineLock className="text-3xl text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">إعادة تعيين كلمة المرور</h1>
          {userInfo && (
            <p className="text-white/90 text-sm">
              مرحباً {userInfo.name} ({userInfo.email})
            </p>
          )}
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور الجديدة *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  className={`w-full p-4 pr-12 border rounded-lg focus:outline-none focus:ring-2 ${
                    validationErrors.newPassword ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[var(--color-primary-500)]'
                  }`}
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute left-4 top-4 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </button>
              </div>
              {validationErrors.newPassword && (
                <div className="mt-2 text-red-500 text-xs">
                  {validationErrors.newPassword.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تأكيد كلمة المرور *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full p-4 pr-12 border rounded-lg focus:outline-none focus:ring-2 ${
                    validationErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[var(--color-primary-500)]'
                  }`}
                  placeholder="أعد إدخال كلمة المرور"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute left-4 top-4 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <div className="mt-2 text-red-500 text-xs">
                  {validationErrors.confirmPassword.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              )}
              {formData.newPassword && formData.confirmPassword && 
               formData.newPassword === formData.confirmPassword && 
               !validationErrors.newPassword && (
                <div className="mt-2 text-green-500 text-xs flex items-center gap-1">
                  <AiOutlineCheck />
                  كلمات المرور متطابقة
                </div>
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>متطلبات كلمة المرور:</strong>
                <br />
                • 6 أحرف على الأقل
                <br />
                • حرف واحد على الأقل (A-Z أو a-z)
                <br />
                • رقم واحد على الأقل (0-9)
              </p>
            </div>

            <button
              type="submit"
              disabled={!isFormValid() || loading}
              className="w-full bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-700)] text-white py-4 rounded-lg font-semibold hover:from-[var(--color-primary-700)] hover:to-[var(--color-primary-800)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <Link
              to="/login"
              className="text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] font-medium text-sm transition-colors"
            >
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}