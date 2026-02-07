import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  AiOutlineExclamationCircle,
  AiOutlineEye,
  AiOutlineEyeInvisible,
} from "react-icons/ai";
import SuccessModal from "../components/SuccessModal"; // adjust path if needed
const API_BASE = import.meta.env.VITE_API_BASE || "";



export default function TeacherRegister() {
  const [showModal, setShowModal] = useState(false);
  const [registrationResponse, setRegistrationResponse] = useState(null);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({
    id: "",
    first_name: "",
    second_name: "",
    third_name: "",
    last_name: "",
    address: "",
    phone: "",
    email: "",
    password: "",
    user_type: "teacher",
    school_id: "",
    specialization: "",
    qualifications: "",
    salary: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [inputErrors, setInputErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/schools/public`);
      setSchools(response.data.schools || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const errors = {};
    if (!form.first_name) errors.first_name = "يرجى تعبئة هذا الحقل";
    if (!form.second_name) errors.second_name = "يرجى تعبئة هذا الحقل";
    if (!form.third_name) errors.third_name = "يرجى تعبئة هذا الحقل";
    if (!form.last_name) errors.last_name = "يرجى تعبئة هذا الحقل";

    if (!form.id) errors.id = "يرجى تعبئة هذا الحقل";
    else if (!/^\d{10}$/.test(form.id))
      errors.id = "رقم الهوية يجب أن يكون 10 أرقام";

    if (!form.phone) errors.phone = "يرجى تعبئة رقم الجوال";
    else if (!/^05\d{8}$/.test(form.phone))
      errors.phone = "رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05";

    if (!form.email) errors.email = "يرجى تعبئة هذا الحقل";
    else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(form.email))
      errors.email = "صيغة البريد الإلكتروني غير صحيحة";

    if (!form.password) errors.password = "يرجى تعبئة هذا الحقل";
    else if (form.password.length < 6)
      errors.password = "كلمة المرور يجب أن تكون 6 أحرف أو أكثر";

    if (!form.user_type) errors.user_type = "يرجى اختيار نوع المستخدم";

    // Only require school_id for non-administrators
    if (form.user_type !== 'administrator' && !form.school_id) {
      errors.school_id = "يرجى اختيار مجمع الحلقات";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errors = validate();
    setInputErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const response = await axios.post(`${API_BASE}/api/teachers`, form);
      setRegistrationResponse(response.data);
      setSuccess(true);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || "حدث خطأ أثناء التسجيل");
    }
  };

  return (
    <div className="bg-[url('/baground.svg')] bg-cover bg-center bg-no-repeat bg-blend-overlay min-h-screen flex flex-col items-center justify-center font-[var(--font-family-arabic)] py-8">
      <h1 className="text-xl sm:text-3xl font-bold mb-6 text-center text-[var(--color-primary-700)] bg-gradient-to-r from-background-dark to-text-muted bg-clip-text text-transparent">
        اهلا بك عزيزي المربي والمعلم.. ونشكر لك تسجيلك
      </h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white/90 p-8 rounded-xl w-full max-w-2xl shadow-xl space-y-6"
        style={{ backdropFilter: "blur(2px)" }}
      >
        <h2 className="text-2xl font-bold mb-4 text-center text-[var(--color-primary-500)]">
          يرجى تعبئة الحقول التالية للتسجيل
        </h2>

        {success && (
          <div className="text-green-600 text-center mb-4 font-bold">
            ✅ تم التسجيل بنجاح! سيتم تحويلك للصفحة الرئيسية
          </div>
        )}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <div className="bg-primary-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-primary-700)]">
            البيانات الأساسية
          </h3>
          
          {/* User Type Selection */}
          <div className="mb-4">
            <select
              name="user_type"
              value={form.user_type}
              onChange={handleChange}
              className={`p-3 w-full border ${
                inputErrors.user_type
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors bg-white`}
            >
              <option value="teacher">معلم</option>
              <option value="admin">مدير منصة</option>
              <option value="administrator">مدير مجمع</option>
              <option value="supervisor">مشرف</option>
            </select>
            {inputErrors.user_type && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.user_type}
              </div>
            )}
          </div>

          {/* School Selection */}
          <div className="mb-4">
            <select
              name="school_id"
              value={form.school_id}
              onChange={handleChange}
              className={`p-3 w-full border ${
                inputErrors.school_id
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors bg-white`}
            >
              <option value="">اختر مجمع الحلقات *</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
            {inputErrors.school_id && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.school_id}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {["first_name", "second_name", "third_name", "last_name"].map(
              (field, idx) => (
                <div key={field}>
                  <input
                    name={field}
                    placeholder={
                      ["الإسم الأول", "الاسم الثاني", "اسم الجد", "العائلة"][
                        idx
                      ]
                    }
                    value={form[field]}
                    onChange={handleChange}
                    className={`p-3 border ${
                      inputErrors[field]
                        ? "border-[var(--color-error-500)]"
                        : "border-light"
                    } rounded-lg focus:border-accent focus:outline-none transition-colors`}
                  />
                  {inputErrors[field] && (
                    <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                      <AiOutlineExclamationCircle className="ml-1" />
                      {inputErrors[field]}
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          <div>
            <input
              name="id"
              placeholder="رقم الهوية"
              value={form.id}
              onChange={handleChange}
              className={`mt-4 p-3 w-full border ${
                inputErrors.id
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors`}
            />
            {inputErrors.id && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.id}
              </div>
            )}
          </div>
          <div>
            <input
              name="phone"
              placeholder="رقم الجوال (10 أرقام يبدأ بـ 05)"
              value={form.phone}
              onChange={handleChange}
              className={`mt-4 p-3 w-full border ${
                inputErrors.phone
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors`}
            />
            {inputErrors.phone && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.phone}
              </div>
            )}
          </div>
          <div>
            <input
              name="address"
              placeholder="العنوان (اختياري)"
              value={form.address}
              onChange={handleChange}
              className={`mt-4 p-3 w-full border ${
                inputErrors.address
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors`}
            />
            {inputErrors.address && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.address}
              </div>
            )}
          </div>
          <div>
            <input
              type="email"
              name="email"
              placeholder="الايميل"
              value={form.email}
              onChange={handleChange}
              className={`mt-4 p-3 w-full border ${
                inputErrors.email
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors`}
            />
            {inputErrors.email && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.email}
              </div>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="الرقم السري"
              value={form.password}
              onChange={handleChange}
              className={`mt-4 p-3 w-full border ${
                inputErrors.password
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xl text-gray-500 focus:outline-none"
            >
              {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </button>
            {inputErrors.password && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.password}
              </div>
            )}
          </div>
        </div>

        {/* Additional Fields Section */}
        <div className="bg-background-secondary p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-primary-700)]">
            معلومات إضافية (اختيارية)
          </h3>
          
          {form.user_type === 'teacher' && (
            <div>
              <input
                name="specialization"
                placeholder="التخصص (اختياري)"
                value={form.specialization}
                onChange={handleChange}
                className={`p-3 w-full border ${
                  inputErrors.specialization
                    ? "border-[var(--color-error-500)]"
                    : "border-light"
                } rounded-lg focus:border-accent focus:outline-none transition-colors`}
              />
              {inputErrors.specialization && (
                <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                  <AiOutlineExclamationCircle className="ml-1" />
                  {inputErrors.specialization}
                </div>
              )}
            </div>
          )}
          
          <div>
            <textarea
              name="qualifications"
              placeholder="المؤهلات والشهادات (اختياري)"
              value={form.qualifications}
              onChange={handleChange}
              rows="3"
              className={`mt-4 p-3 w-full border ${
                inputErrors.qualifications
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors resize-vertical`}
            />
            {inputErrors.qualifications && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.qualifications}
              </div>
            )}
          </div>



        </div>

        <button
          type="submit"
          className="w-full bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-3 rounded-lg font-semibold transition-colors"
        >
          تسجيل ك{form.user_type === 'teacher' ? 'معلم' : form.user_type === 'admin' ? 'مدير منصة' : form.user_type === 'administrator' ? 'مدير مجمع' : 'مشرف'}
        </button>
      </form>
      {showModal && (
        <SuccessModal 
          onClose={() => navigate("/")}
          title={registrationResponse?.status === 'pending_activation' ? 'طلب قيد المراجعة!' : undefined}
          message={registrationResponse?.message}
          isInactive={registrationResponse?.status === 'pending_activation'}
          buttonText="العودة للرئيسية"
        />
      )}
    </div>
  );
}
