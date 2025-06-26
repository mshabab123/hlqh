import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    id: "",
    first_name: "",
    second_name: "",
    third_name: "",
    last_name: "",
    neighborhood: "",
    email: "",
    password: "",
  });

  const [children, setChildren] = useState([]);
  const [registerSelf, setRegisterSelf] = useState(false);
  const [selfSchoolLevel, setSelfSchoolLevel] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
        password: "",
      },
    ]);
  };

  const removeChild = (index) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const registrationData = {
        ...form,
        children,
        registerSelf,
        selfSchoolLevel: registerSelf ? selfSchoolLevel : undefined,
      };
      await axios.post("http://localhost:5000/api/users", registrationData);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="bg-[url('/baground.svg')] bg-cover bg-center bg-no-repeat bg-blend-overlay min-h-screen flex flex-col items-center justify-center font-[var(--font-family-arabic)] py-8">
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
            <input
              name="first_name"
              placeholder="الإسم الأول"
              value={form.first_name}
              onChange={handleChange}
              className="p-3 border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
              required
            />
            <input
              name="second_name"
              placeholder="الاسم الثاني"
              value={form.second_name}
              onChange={handleChange}
              className="p-3 border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
              required
            />
            <input
              name="third_name"
              placeholder="اسم الجد"
              value={form.third_name}
              onChange={handleChange}
              className="p-3 border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
              required
            />
            <input
              name="last_name"
              placeholder="العائلة"
              value={form.last_name}
              onChange={handleChange}
              className="p-3 border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
              required
            />
          </div>
          <input
            name="id"
            placeholder="رقم الهوية"
            value={form.id}
            onChange={handleChange}
            className="mt-4 p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
            required
          />
          <input
            name="neighborhood"
            placeholder="الحي"
            value={form.neighborhood}
            onChange={handleChange}
            className="mt-4 p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="الايميل"
            value={form.email}
            onChange={handleChange}
            className="mt-4 p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="الرقم السري"
            value={form.password}
            onChange={handleChange}
            className="mt-4 p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
            required
          />
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
              // className=`px-6 py-2 rounded-lg font-semibold text-white transition-colors"

              className="px-10 bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-3 rounded-lg font-semibold transition-colors"

              // className="bg-[var(--color-success-500)] hover:bg-[var(--color-success-600)] text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
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
                <input
                  name="first_name"
                  placeholder="الإسم الأول"
                  value={child.first_name}
                  onChange={(e) => handleChildChange(index, e)}
                  className="p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
                  required
                />
                <input
                  name="id"
                  placeholder="رقم الهوية"
                  value={child.id}
                  onChange={(e) => handleChildChange(index, e)}
                  className="p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
                  required
                />
                <select
                  name="school_level"
                  value={child.school_level}
                  onChange={(e) => handleChildChange(index, e)}
                  className="p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors bg-white"
                  required
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
                <input
                  name="date_of_birth"
                  type="date"
                  placeholder="تاريخ الميلاد"
                  value={child.date_of_birth}
                  onChange={(e) => handleChildChange(index, e)}
                  className="p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
                  required
                />
                <input
                  name="password"
                  type="password"
                  placeholder="كلمة المرور للابن"
                  value={child.password}
                  onChange={(e) => handleChildChange(index, e)}
                  className="p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>
          ))}
        </div>

        {/* Parent Self-Registration Section */}
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
        <div>
          {registerSelf && (
            <div className="bg-background-secondary p-6 rounded-lg mt-8 mt-4">
              <label className="block mb-2">المرحلة الدراسية الخاصة بك:</label>
              <select
                value={selfSchoolLevel}
                onChange={(e) => setSelfSchoolLevel(e.target.value)}
                className="p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors bg-white"
                required
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
    </div>
  );
}
