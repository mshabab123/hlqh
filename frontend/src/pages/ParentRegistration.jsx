import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  AiOutlineExclamationCircle,
  AiOutlineEye,
  AiOutlineEyeInvisible,
} from "react-icons/ai";
import SuccessModal from "../components/SuccessModal";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function ParentRegistration() {
  const [showModal, setShowModal] = useState(false);
  const [registrationResponse, setRegistrationResponse] = useState(null);
  
  const [form, setForm] = useState({
    id: "",
    first_name: "",
    second_name: "",
    third_name: "",
    last_name: "",
    neighborhood: "",
    phone: "",
    email: "",
    password: "",
  });

  const [childIds, setChildIds] = useState([""]);
  const [showPassword, setShowPassword] = useState(false);
  const [registerSelf, setRegisterSelf] = useState(false);
  const [selfSchoolLevel, setSelfSchoolLevel] = useState("");
  const [error, setError] = useState("");
  const [inputErrors, setInputErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleChildIdChange = (index, value) => {
    const updatedChildIds = [...childIds];
    updatedChildIds[index] = value;
    setChildIds(updatedChildIds);
  };

  const addChildId = () => {
    setChildIds([...childIds, ""]);
  };

  const removeChildId = (index) => {
    setChildIds(childIds.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    let errors = {};

    // Parent fields validation
    if (!form.first_name) errors.first_name = "يرجى تعبئة هذا الحقل";
    if (!form.second_name) errors.second_name = "يرجى تعبئة هذا الحقل";
    if (!form.third_name) errors.third_name = "يرجى تعبئة هذا الحقل";
    if (!form.last_name) errors.last_name = "يرجى تعبئة هذا الحقل";

    if (!form.id) {
      errors.id = "يرجى تعبئة هذا الحقل";
    } else if (!/^\d{10}$/.test(form.id)) {
      errors.id = "رقم الهوية يجب أن يكون مكونًا من 10 أرقام";
    }

    if (!form.phone) {
      errors.phone = "يرجى تعبئة رقم الجوال";
    } else if (!/^05\d{8}$/.test(form.phone)) {
      errors.phone = "رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05";
    }

    if (!form.neighborhood) errors.neighborhood = "يرجى تعبئة هذا الحقل";

    if (!form.email) {
      errors.email = "يرجى تعبئة هذا الحقل";
    } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(form.email)) {
      errors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (!form.password) errors.password = "يرجى تعبئة هذا الحقل";

    // Child IDs validation
    const validChildIds = childIds.filter(id => id.trim() !== "");
    validChildIds.forEach((childId, idx) => {
      if (childId && !/^\d{10}$/.test(childId)) {
        errors[`child_id_${idx}`] = "رقم الهوية يجب أن يكون 10 أرقام";
      }
    });

    // Self-registration validation
    if (registerSelf && !selfSchoolLevel) {
      errors.selfSchoolLevel = "يرجى اختيار المرحلة الدراسية";
    }

    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);
      return;
    }

    setInputErrors({});
    
    try {
      const registrationData = {
        ...form,
        childIds: validChildIds,
        registerSelf,
        selfSchoolLevel: registerSelf ? selfSchoolLevel : undefined,
      };
      
      const response = await axios.post(`${API_BASE}/api/parents`, registrationData);
      setRegistrationResponse(response.data);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="bg-[url('/baground.svg')] bg-cover bg-fixed bg-center bg-no-repeat bg-blend-overlay min-h-screen flex flex-col items-center justify-center font-[var(--font-family-arabic)] py-8">
      <h1 className="text-xl sm:text-3xl font-bold mb-6 text-center text-[var(--color-primary-700)] bg-gradient-to-r from-background-dark to-text-muted bg-clip-text text-transparent">
        تسجيل ولي الأمر
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white/90 p-8 rounded-xl w-full max-w-2xl shadow-xl space-y-6"
        style={{ backdropFilter: "blur(2px)" }}
      >
        <h2 className="text-2xl font-bold mb-4 text-center text-[var(--color-primary-500)]">
          تسجيل ولي الأمر وربط الأبناء
        </h2>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {/* Parent Form */}
        <div className="bg-primary-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-primary-700)]">
            بيانات ولي الأمر
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              name="neighborhood"
              placeholder="الحي"
              value={form.neighborhood}
              onChange={handleChange}
              className={`mt-4 p-3 w-full border ${
                inputErrors.neighborhood
                  ? "border-[var(--color-error-500)]"
                  : "border-light"
              } rounded-lg focus:border-accent focus:outline-none transition-colors`}
            />
            {inputErrors.neighborhood && (
              <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                <AiOutlineExclamationCircle className="ml-1" />
                {inputErrors.neighborhood}
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

        {/* Children IDs Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--color-primary-700)]">
            أرقام هوية الأبناء المراد ربطهم
          </h3>
          
          <div className="bg-background-secondary p-6 rounded-lg">
            <p className="text-sm text-gray-600 mb-4">
              أدخل أرقام هوية الأبناء الذين ترغب في ربطهم بحسابك. يمكن أن يكون الأبناء مسجلين مسبقاً أو سيتم تسجيلهم لاحقاً.
            </p>
            
            {childIds.map((childId, index) => (
              <div key={index} className="flex items-center gap-4 mb-4">
                <input
                  placeholder={`رقم هوية الإبن ${index + 1}`}
                  value={childId}
                  onChange={(e) => handleChildIdChange(index, e.target.value)}
                  className={`p-3 flex-1 border ${
                    inputErrors[`child_id_${index}`]
                      ? "border-[var(--color-error-500)]"
                      : "border-light"
                  } rounded-lg focus:border-accent focus:outline-none transition-colors`}
                />
                {childIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChildId(index)}
                    className="bg-[var(--color-error-500)] hover:bg-[var(--color-error-600)] text-white px-3 py-2 rounded text-sm transition-colors"
                  >
                    حذف
                  </button>
                )}
                {inputErrors[`child_id_${index}`] && (
                  <div className="flex items-center text-[var(--color-error-600)] text-sm">
                    <AiOutlineExclamationCircle className="ml-1" />
                    {inputErrors[`child_id_${index}`]}
                  </div>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={addChildId}
              className="w-full bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-3 rounded-lg font-semibold transition-colors mt-4"
            >
              <span>+</span> إضافة رقم هوية ابن آخر
            </button>
          </div>
        </div>

        {/* Parent Self-Registration Section */}
        <div className="bg-background-secondary p-6 rounded-lg mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--color-primary-700)]">
              هل ترغب في تسجيل نفسك كطالب؟
            </h3>
            <button
              type="button"
              onClick={() => setRegisterSelf(!registerSelf)}
              className={`px-6 py-2 rounded-lg font-semibold text-white transition-colors
                ${
                  registerSelf
                    ? "bg-[var(--color-primary-700)]"
                    : "bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)]"
                }
              `}
            >
              {registerSelf ? "إلغاء التسجيل كطالب" : "نعم، أرغب بذلك"}
            </button>
          </div>
          {registerSelf && (
            <div className="mt-4">
              <label className="block mb-2">المرحلة الدراسية الخاصة بك:</label>
              <select
                value={selfSchoolLevel}
                onChange={(e) => setSelfSchoolLevel(e.target.value)}
                className={`p-3 w-full border ${
                  inputErrors.selfSchoolLevel
                    ? "border-[var(--color-error-500)]"
                    : "border-light"
                } rounded-lg focus:border-accent focus:outline-none transition-colors bg-white`}
              >
                <option value="">اختر المرحلة الدراسية</option>
                <option value="grade10">أولى ثانوي</option>
                <option value="grade11">ثاني ثانوي</option>
                <option value="grade12">ثالث ثانوي</option>
                <option value="university">جامعة</option>
                <option value="graduate">اكمل الجامعة</option>
                <option value="master">ماجستير</option>
                <option value="phd">دكتوراه</option>
                <option value="employee">موظف</option>
              </select>
              {inputErrors.selfSchoolLevel && (
                <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                  <AiOutlineExclamationCircle className="ml-1" />
                  {inputErrors.selfSchoolLevel}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-3 rounded-lg font-semibold transition-colors"
        >
          طلب التسجيل
        </button>
        
        <div className="text-center mt-4">
          <p className="text-gray-600 mb-2">
            هل تريد تسجيل طالب مباشرة؟
          </p>
          <Link 
            to="/student-registration" 
            className="text-[var(--color-primary-500)] hover:text-[var(--color-primary-700)] font-semibold"
          >
            تسجيل طالب جديد
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