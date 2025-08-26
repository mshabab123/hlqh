import { useState } from "react";
import axios from "axios";
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineLock, AiOutlineCheck, AiOutlineWarning } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

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
      const response = await axios.post(`${API_BASE}/api/profile/change-password`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      onSuccess?.(response.data.message);
      handleClose();
    } catch (err) {
      if (err.response?.data?.details) {
        // Handle validation errors
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
        setError(err.response?.data?.error || "فشل في تغيير كلمة المرور");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    setError("");
    setValidationErrors({});
    onClose();
  };

  const isFormValid = () => {
    return (
      formData.currentPassword &&
      formData.newPassword &&
      formData.confirmPassword &&
      formData.newPassword === formData.confirmPassword &&
      Object.keys(validationErrors).length === 0
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full m-4">
        <div className="flex items-center gap-3 mb-6">
          <AiOutlineLock className="text-2xl text-[var(--color-primary-700)]" />
          <h3 className="text-xl font-bold text-[var(--color-primary-700)]">
            تغيير كلمة المرور
          </h3>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded">
          <div className="flex items-start">
            <AiOutlineWarning className="text-amber-400 mt-1 ml-2" />
            <div>
              <p className="text-amber-700 font-medium text-sm">نصائح أمنية:</p>
              <ul className="text-amber-600 text-xs mt-1 list-disc list-inside">
                <li>استخدم كلمة مرور قوية ومختلفة</li>
                <li>لا تشارك كلمة المرور مع أي شخص</li>
                <li>غيّر كلمة المرور بانتظام</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium mb-2">كلمة المرور الحالية *</label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="أدخل كلمة المرور الحالية"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium mb-2">كلمة المرور الجديدة *</label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                className={`w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.newPassword ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                }`}
                required
                placeholder="أدخل كلمة المرور الجديدة"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
              </button>
            </div>
            {validationErrors.newPassword && (
              <div className="mt-1 text-red-500 text-xs">
                {validationErrors.newPassword.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-2">تأكيد كلمة المرور *</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                }`}
                required
                placeholder="أعد إدخال كلمة المرور الجديدة"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <div className="mt-1 text-red-500 text-xs">
                {validationErrors.confirmPassword.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            )}
            {formData.newPassword && formData.confirmPassword && 
             formData.newPassword === formData.confirmPassword && 
             !validationErrors.newPassword && (
              <div className="mt-1 text-green-500 text-xs flex items-center">
                <AiOutlineCheck className="ml-1" />
                كلمات المرور متطابقة
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isFormValid() || loading}
              className="px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-lg hover:bg-[var(--color-primary-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "جاري التغيير..." : "تغيير كلمة المرور"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}