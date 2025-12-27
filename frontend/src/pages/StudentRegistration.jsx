import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  AiOutlineExclamationCircle,
  AiOutlineEye,
  AiOutlineEyeInvisible,
} from "react-icons/ai";
import SuccessModal from "../components/SuccessModal";
import SchoolLevelSelect from "../components/SchoolLevelSelect";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function StudentRegistration() {
  const [showModal, setShowModal] = useState(false);
  const [registrationResponse, setRegistrationResponse] = useState(null);
  
  const [form, setForm] = useState({
    id: "",
    first_name: "",
    second_name: "",
    third_name: "",
    last_name: "",
    phone: "",
    email: "",
    password: "",
    school_level: "",
    date_of_birth: "",
    parent_id: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [inputErrors, setInputErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    let errors = {};

    // Student fields validation
    if (!form.first_name) errors.first_name = "يرجى تعبئة هذا الحقل";
    if (!form.second_name) errors.second_name = "يرجى تعبئة هذا الحقل";
    if (!form.third_name) errors.third_name = "يرجى تعبئة هذا الحقل";
    if (!form.last_name) errors.last_name = "يرجى تعبئة هذا الحقل";

    if (!form.id) {
      errors.id = "يرجى تعبئة هذا الحقل";
    } else if (!/^\d{10}$/.test(form.id)) {
      errors.id = "رقم الهوية يجب أن يكون مكونًا من 10 أرقام";
    }

    if (!form.school_level) {
      errors.school_level = "يرجى تعبئة هذا الحقل";
    }

    if (!form.date_of_birth) {
      errors.date_of_birth = "يرجى إدخال تاريخ الميلاد";
    }

    if (!form.password) errors.password = "يرجى تعبئة هذا الحقل";

    // Optional fields validation
    if (form.phone && !/^05\d{8}$/.test(form.phone)) {
      errors.phone = "رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05";
    }

    if (form.email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(form.email)) {
      errors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (form.parent_id && !/^\d{10}$/.test(form.parent_id)) {
      errors.parent_id = "رقم هوية ولي الأمر يجب أن يكون 10 أرقام";
    }

    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);
      return;
    }

    setInputErrors({});
    
    try {
      const registrationData = {
        ...form,
        parent_id: form.parent_id || null, // Send null if empty
      };
      
      const response = await axios.post(`${API_BASE}/api/students`, registrationData);
      setRegistrationResponse(response.data);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="bg-[url('/baground.svg')] bg-cover bg-fixed bg-center bg-no-repeat bg-blend-overlay min-h-screen flex flex-col items-center justify-center font-[var(--font-family-arabic)] py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-[var(--color-primary-700)] bg-gradient-to-r from-background-dark to-text-muted bg-clip-text text-transparent">
        تسجيل طالب
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white/90 p-8 rounded-xl w-full max-w-2xl shadow-xl space-y-6"
        style={{ backdropFilter: "blur(2px)" }}
      >
        <h2 className="text-2xl font-bold mb-4 text-center text-[var(--color-primary-500)]">
          تسجيل طالب جديد في الحلقة
        </h2>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {/* Student Form */}
        <div className="bg-primary-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-primary-700)]">
            البيانات الأساسية للطالب
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                name="first_name"
                placeholder="الإسم الأول"
                value={form.first_name}
                onChange={handleChange}
                className={`p-3 border ${
                  inputErrors.first_name
                    ? "border-[var(--color-error-500)]"
                    : "border-light"
                } rounded-lg focus:border-accent focus:outline-none transition-colors`}
              />
              {inputErrors.first_name && (
                <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                  <AiOutlineExclamationCircle className="ml-1" />
                  {inputErrors.first_name}
                </div>
              )}
            </div>
            <div>
              <input
                name="second_name"
                placeholder="الاسم الثاني"
                value={form.second_name}
                onChange={handleChange}
                className={`p-3 border ${
                  inputErrors.second_name
                    ? "border-[var(--color-error-500)]"
                    : "border-light"
                } rounded-lg focus:border-accent focus:outline-none transition-colors`}
              />
              {inputErrors.second_name && (
                <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                  <AiOutlineExclamationCircle className="ml-1" />
                  {inputErrors.second_name}
                </div>
              )}
            </div>
            <div>
              <input
                name="third_name"
                placeholder="اسم الجد"
                value={form.third_name}
                onChange={handleChange}
                className={`p-3 border ${
                  inputErrors.third_name
                    ? "border-[var(--color-error-500)]"
                    : "border-light"
                } rounded-lg focus:border-accent focus:outline-none transition-colors`}
              />
              {inputErrors.third_name && (
                <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                  <AiOutlineExclamationCircle className="ml-1" />
                  {inputErrors.third_name}
                </div>
              )}
            </div>
            <div>
              <input
                name="last_name"
                placeholder="العائلة"
                value={form.last_name}
                onChange={handleChange}
                className={`p-3 border ${
                  inputErrors.last_name
                    ? "border-[var(--color-error-500)]"
                    : "border-light"
                } rounded-lg focus:border-accent focus:outline-none transition-colors`}
              />
              {inputErrors.last_name && (
                <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                  <AiOutlineExclamationCircle className="ml-1" />
                  {inputErrors.last_name}
                </div>
              )}
            </div>
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
              name="date_of_birth"
              type="date"
              placeholder="تاريخ الميلاد"
              value={form.date_of_birth}
              onChange={handleChange}
              className={`mt-4 p-3 w-full border ${
                inputErrors.date_of_birth
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors`}
            />
            {inputErrors.date_of_birth && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.date_of_birth}
              </div>
            )}
          </div>

          <div>
            <select
              name="school_level"
              value={form.school_level}
              onChange={handleChange}
              className={`mt-4 p-3 w-full border ${
                inputErrors.school_level
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors bg-white`}
            >
              <option value="">اختر المرحلة الدراسية</option>
              <option value=" لم يدخل المدرسة">لم يدخل المدرسة</option>
              <option value="روضة">روضة</option>
              <option value="الأول الابتدائي">الأول الابتدائي</option>
              <option value="الثاني الابتدائي">الثاني الابتدائي</option>
              <option value="الثالث الابتدائي">الثالث الابتدائي</option>
              <option value="الرابع الابتدائي">الرابع الابتدائي</option>
              <option value="الخامس الابتدائي">الخامس الابتدائي</option>
              <option value="السادس الابتدائي">السادس الابتدائي</option>
              <option value="الأول متوسط">الأول متوسط</option>
              <option value="الثاني متوسط">الثاني متوسط</option>
              <option value="الثالث متوسط">الثالث متوسط</option>
              <option value="الأول ثانوي">الأول ثانوي</option>
              <option value="الثاني ثانوي">الثاني ثانوي</option>
              <option value="الثالث ثانوي">الثالث ثانوي</option>
              <option value="جامعة">جامعة</option>
              <option value="خريج">خريج</option>
              <option value="دراسات عليا">دراسات عليا</option>
              <option value="موظف">موظف</option>
              <option value="غير محدد">غير محدد</option>
            </select>
            {inputErrors.school_level && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.school_level}
              </div>
            )}
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="كلمة المرور"
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

        {/* Optional Contact Information */}
        <div className="bg-background-secondary p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-primary-700)]">
            معلومات إضافية (اختيارية)
          </h3>
          
          <div>
            <input
              name="phone"
              placeholder="رقم الجوال (اختياري - 10 أرقام يبدأ بـ 05)"
              value={form.phone}
              onChange={handleChange}
              className={`p-3 w-full border ${
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
              type="email"
              name="email"
              placeholder="البريد الإلكتروني (اختياري)"
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

          <div>
            <input
              name="parent_id"
              placeholder="رقم هوية ولي الأمر (اختياري للربط)"
              value={form.parent_id}
              onChange={handleChange}
              className={`mt-4 p-3 w-full border ${
                inputErrors.parent_id
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors`}
            />
            {inputErrors.parent_id && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.parent_id}
              </div>
            )}
            <p className="text-sm text-gray-600 mt-1">
              إذا كان لديك ولي أمر مسجل، أدخل رقم هويته لربط الحساب
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-3 rounded-lg font-semibold transition-colors"
        >
          طلب التسجيل
        </button>
        
        <div className="text-center mt-4">
          <p className="text-gray-600 mb-2">
            هل أنت ولي أمر وتريد تسجيل حساب ولي أمر؟
          </p>
          <Link 
            to="/parent-registration" 
            className="text-[var(--color-primary-500)] hover:text-[var(--color-primary-700)] font-semibold"
          >
            تسجيل ولي أمر
          </Link>
        </div>
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
