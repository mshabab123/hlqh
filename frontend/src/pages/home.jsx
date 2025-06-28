// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthNavbar from "../components/AuthNavbar";

export default function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Load user info from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      // Not logged in, redirect to login
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) {
    return null; // Or a loading spinner
  }

  return (
    <>
      {/* <AuthNavbar /> */}
      <div className="bg-[url('/baground.svg')] bg-cover bg-center bg-no-repeat bg-fixed bg-blend-overlay min-h-screen flex flex-col items-center justify-center font-[var(--font-family-arabic)] py-8">
        <div
          className="bg-white/90 p-10 rounded-xl max-w-lg w-full shadow-xl space-y-8 text-center"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <h1 className="text-3xl font-bold mb-6 text-[var(--color-primary-700)] bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-700)] bg-clip-text text-transparent">
            مرحباً بك في المنصة!
          </h1>
          <div className="text-xl font-semibold text-[var(--color-primary-700)]">
            {user.first_name} {user.second_name} {user.third_name}{" "}
            {user.last_name}
          </div>
          <div className="mt-2 text-[var(--color-text-secondary)]">
            {user.role === "Parent"
              ? "ولي أمر"
              : user.role === "Student"
              ? "طالب"
              : user.role === "Teacher"
              ? "معلم"
              : user.role}
          </div>
          <div className="mt-2 text-[var(--color-text-secondary)]">
            <span className="font-bold">البريد الإلكتروني:</span> {user.email}
          </div>
          {user.phone && (
            <div className="mt-2 text-[var(--color-text-secondary)]">
              <span className="font-bold">الجوال:</span> {user.phone}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="mt-6 w-full bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-3 rounded-lg font-semibold transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </>
  );
}
