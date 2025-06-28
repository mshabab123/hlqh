import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

import {
  AiOutlineExclamationCircle,
  AiOutlineEye,
  AiOutlineEyeInvisible,
  AiOutlineLoading3Quarters,
} from "react-icons/ai";
const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function Login() {
  const [form, setForm] = useState({ id: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // const res = await axios.post("http://localhost:5000/api/auth/login", {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        id: form.id,
        password: form.password,
      });

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setLoading(false);
        navigate("/Home");
      }
    } catch (err) {
      setError(err.response?.data?.error || "بيانات الدخول غير صحيحة");
      setLoading(false);
    }
  };

  return (
    <div className="bg-[url('/baground.svg')] bg-cover bg-center bg-no-repeat bg-blend-overlay min-h-screen flex flex-col items-center justify-center font-[var(--font-family-arabic)] py-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white/90 p-8 rounded-xl w-full max-w-md shadow-xl space-y-6"
        style={{ backdropFilter: "blur(2px)" }}
      >
        <h1 className="text-3xl font-bold mb-6 text-center text-[var(--color-primary-700)] bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-700)] bg-clip-text text-transparent">
          تسجيل الدخول
        </h1>

        {error && (
          <div className="flex items-center text-[var(--color-error-700)] bg-[var(--color-error-100)] border border-[var(--color-error-400)] px-4 py-2 rounded mb-4">
            <AiOutlineExclamationCircle className="ml-2" /> {error}
          </div>
        )}

        <input
          name="id"
          type="text"
          placeholder="رقم الهوية"
          value={form.id}
          onChange={handleChange}
          className="p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
          required
        />

        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="كلمة المرور"
            value={form.password}
            onChange={handleChange}
            className="p-3 w-full border border-light rounded-lg focus:border-accent focus:outline-none transition-colors"
            required
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xl text-gray-500 focus:outline-none"
          >
            {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
        >
          {loading && (
            <AiOutlineLoading3Quarters className="animate-spin ml-2" />
          )}
          {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
        </button>

        {/* Register link */}
        <div className="mt-4 text-center text-gray-700">
          ليس لديك حساب؟
          <Link
            to="/registration"
            className="text-[var(--color-primary-700)] hover:underline font-bold mx-1"
          >
            إنشاء حساب جديد
          </Link>
        </div>
      </form>
    </div>
  );
}
