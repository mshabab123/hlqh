import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  AiOutlineExclamationCircle,
  AiOutlineEye,
  AiOutlineEyeInvisible,
} from "react-icons/ai";
import SuccessModal from "../components/SuccessModal"; // adjust path if needed

export default function Register() {
  const [showModal, setShowModal] = useState(false);

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

  const [children, setChildren] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showChildPasswords, setShowChildPasswords] = useState([]);
  const [registerSelf, setRegisterSelf] = useState(false);
  const [selfSchoolLevel, setSelfSchoolLevel] = useState("");
  const [error, setError] = useState("");
  const [inputErrors, setInputErrors] = useState({});
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleChildChange = (index, e) => {
    const updatedChildren = [...children];
    updatedChildren[index] = {
      ...updatedChildren[index],
      [e.target.name]: e.target.value,
    };
    setChildren(updatedChildren);
  };

  const addChild = () => {
    setChildren([
      ...children,
      {
        first_name: "",
        id: "",
        school_level: "",
        date_of_birth: "",
        phone: "",
        password: "",
      },
    ]);
    setShowChildPasswords([...showChildPasswords, false]);
  };

  const removeChild = (index) => {
    setChildren(children.filter((_, i) => i !== index));
    setShowChildPasswords(showChildPasswords.filter((_, i) => i !== index));
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

    // Parent phone validation
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

    // Children fields validation
    children.forEach((child, idx) => {
      if (!child.first_name)
        errors[`child_first_name_${idx}`] = "يرجى تعبئة هذا الحقل";
      if (!child.id) errors[`child_id_${idx}`] = "يرجى تعبئة هذا الحقل";
      else if (!/^\d{10}$/.test(child.id))
        errors[`child_id_${idx}`] = "رقم الهوية يجب أن يكون 10 أرقام";
      if (!child.school_level)
        errors[`child_school_level_${idx}`] = "يرجى اختيار المرحلة الدراسية";
      if (!child.date_of_birth)
        errors[`child_date_of_birth_${idx}`] = "يرجى إدخال تاريخ الميلاد";
      if (!child.password)
        errors[`child_password_${idx}`] = "يرجى تعبئة هذا الحقل";
      // Child phone (optional)
      if (child.phone && !/^05\d{8}$/.test(child.phone))
        errors[`child_phone_${idx}`] =
          "رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05";
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
        children,
        registerSelf,
        selfSchoolLevel: registerSelf ? selfSchoolLevel : undefined,
      };
      await axios.post("http://localhost:5000/api/users", registrationData);
      console.log(registrationData);
      setSuccess(true);
      // Redirect after 2 seconds (adjust as needed)
      //setTimeout(() => navigate("/"), 2000);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div
      className="bg-[url('/baground.svg')] bg-cover  bg-fixed
    bg-center bg-no-repeat bg-blend-overlay min-h-screen flex flex-col items-center justify-center 
    font-[var(--font-family-arabic)] py-8"
    >
      <h1 className="text-3xl font-bold mb-6 text-center text-[var(--color-primary-700)] bg-gradient-to-r from-background-dark to-text-muted bg-clip-text text-transparent">
        تسجيل حساب جديد
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white/90 p-8 rounded-xl w-full max-w-2xl shadow-xl space-y-6"
        style={{ backdropFilter: "blur(2px)" }}
      >
        <h2 className="text-2xl font-bold mb-4 text-center text-[var(--color-primary-500)]">
          يرجى تعبئة الحقول التالية للتسجيل
        </h2>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {/* Main User Form */}
        <div className="bg-primary-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-primary-700)]">
            بيانات ولي الأمر
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

        {/* Children Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--color-primary-700)]">
              بيانات الأبناء المراد تسجيلهم في الحلقة{" "}
              {children.length > 0 && `(${children.length})`}
            </h3>
            <button
              type="button"
              onClick={addChild}
              className="px-10 bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-3 rounded-lg font-semibold transition-colors"
            >
              <span>+</span>إضافة ابن
            </button>
          </div>
          {children.map((child, index) => (
            <div
              key={index}
              className="bg-background-secondary p-6 rounded-lg relative"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-[var(--color-primary-600)]">
                  الإبن رقم {index + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => removeChild(index)}
                  className="bg-[var(--color-error-500)] hover:bg-[var(--color-error-600)] text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  حذف
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <input
                    name="first_name"
                    placeholder="الإسم الأول"
                    value={child.first_name}
                    onChange={(e) => handleChildChange(index, e)}
                    className={`p-3 w-full border ${
                      inputErrors[`child_first_name_${index}`]
                        ? "border-[var(--color-error-500)]"
                        : "border-light"
                    } rounded-lg focus:border-accent focus:outline-none transition-colors`}
                  />
                  {inputErrors[`child_first_name_${index}`] && (
                    <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                      <AiOutlineExclamationCircle className="ml-1" />
                      {inputErrors[`child_first_name_${index}`]}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    name="id"
                    placeholder="رقم الهوية"
                    value={child.id}
                    onChange={(e) => handleChildChange(index, e)}
                    className={`p-3 w-full border ${
                      inputErrors[`child_id_${index}`]
                        ? "border-[var(--color-error-500)]"
                        : "border-light"
                    } rounded-lg focus:border-accent focus:outline-none transition-colors`}
                  />
                  {inputErrors[`child_id_${index}`] && (
                    <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                      <AiOutlineExclamationCircle className="ml-1" />
                      {inputErrors[`child_id_${index}`]}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    name="phone"
                    placeholder="رقم جوال الابن (اختياري)"
                    value={child.phone || ""}
                    onChange={(e) => handleChildChange(index, e)}
                    className={`p-3 w-full border ${
                      inputErrors[`child_phone_${index}`]
                        ? "border-[var(--color-error-500)]"
                        : "border-light"
                    } rounded-lg focus:border-accent focus:outline-none transition-colors`}
                  />
                  {inputErrors[`child_phone_${index}`] && (
                    <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                      <AiOutlineExclamationCircle className="ml-1" />
                      {inputErrors[`child_phone_${index}`]}
                    </div>
                  )}
                </div>
                <div>
                  <select
                    name="school_level"
                    value={child.school_level}
                    onChange={(e) => handleChildChange(index, e)}
                    className={`p-3 w-full border ${
                      inputErrors[`child_school_level_${index}`]
                        ? "border-[var(--color-error-500)]"
                        : "border-light"
                    } rounded-lg focus:border-accent focus:outline-none transition-colors bg-white`}
                  >
                    <option value="">اختر المرحلة الدراسية</option>
                    <option value="kg1">روضة أولى</option>
                    <option value="kg2">روضة ثانية</option>
                    <option value="grade1">أولى</option>
                    <option value="grade2">ثانية</option>
                    <option value="grade3">ثالثة</option>
                    <option value="grade4">رابعة</option>
                    <option value="grade5">خامسة</option>
                    <option value="grade6">سادسة</option>
                    <option value="grade7">أولى متوسط</option>
                    <option value="grade8">ثاني متوسط</option>
                    <option value="grade9">ثالث متوسط</option>
                    <option value="grade10">أولى ثانوي</option>
                    <option value="grade11">ثاني ثانوي</option>
                    <option value="grade12">ثالث ثانوي</option>
                    <option value="university">جامعة</option>
                    <option value="graduate">اكمل الجامعة</option>
                    <option value="master">ماجستير</option>
                    <option value="phd">دكتوراه</option>
                    <option value="employee">موظف</option>
                  </select>
                  {inputErrors[`child_school_level_${index}`] && (
                    <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                      <AiOutlineExclamationCircle className="ml-1" />
                      {inputErrors[`child_school_level_${index}`]}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    name="date_of_birth"
                    type="date"
                    placeholder="تاريخ الميلاد"
                    value={child.date_of_birth}
                    onChange={(e) => handleChildChange(index, e)}
                    className={`p-3 w-full border ${
                      inputErrors[`child_date_of_birth_${index}`]
                        ? "border-[var(--color-error-500)]"
                        : "border-light"
                    } rounded-lg focus:border-accent focus:outline-none transition-colors`}
                  />
                  {inputErrors[`child_date_of_birth_${index}`] && (
                    <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                      <AiOutlineExclamationCircle className="ml-1" />
                      {inputErrors[`child_date_of_birth_${index}`]}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <input
                    name="password"
                    type={showChildPasswords[index] ? "text" : "password"}
                    placeholder="كلمة المرور للابن"
                    value={child.password}
                    onChange={(e) => handleChildChange(index, e)}
                    className={`p-3 w-full border ${
                      inputErrors[`child_password_${index}`]
                        ? "border-[var(--color-error-500)]"
                        : "border-light"
                    } rounded-lg focus:border-accent focus:outline-none transition-colors`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      const newArr = [...showChildPasswords];
                      newArr[index] = !newArr[index];
                      setShowChildPasswords(newArr);
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xl text-gray-500 focus:outline-none"
                  >
                    {showChildPasswords[index] ? (
                      <AiOutlineEyeInvisible />
                    ) : (
                      <AiOutlineEye />
                    )}
                  </button>
                  {inputErrors[`child_password_${index}`] && (
                    <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
                      <AiOutlineExclamationCircle className="ml-1" />
                      {inputErrors[`child_password_${index}`]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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
      </form>
      {showModal && <SuccessModal onClose={() => navigate("/login")} />}
    </div>
  );
}
