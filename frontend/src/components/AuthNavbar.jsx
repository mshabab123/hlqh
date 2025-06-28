// src/components/AuthNavbar.jsx

import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AiOutlineLogout,
  AiOutlineUser,
  AiOutlineHome,
  AiOutlineTeam,
} from "react-icons/ai";

const navLinks = [
  { to: "/home", label: "الرئيسية", icon: <AiOutlineHome /> },
  { to: "/children", label: "معلومات الأبناء", icon: <AiOutlineTeam /> },
  { to: "/profile", label: "الملف الشخصي", icon: <AiOutlineUser /> },
];

export default function AuthNavbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav
      className="w-full bg-gradient-to-l from-[var(--color-primary-100)] via-[var(--color-primary-400)] to-[var(--color-primary-700)] text-white py-3 shadow-lg"
      dir="rtl"
    >
      <div className="container mx-auto flex items-center justify-between px-4">
        {/* Logo + App name */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="شعار المنصة"
            className="h-12 w-12 object-contain rounded-full shadow-md border-2 border-white"
            loading="lazy"
          />
          <span className="font-extrabold text-2xl md:text-3xl tracking-tight drop-shadow-sm">
            منصة الحلقات
          </span>
        </div>
        {/* Navigation Links */}
        <ul className="flex gap-8 text-lg font-medium">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`flex items-center gap-1 hover:underline transition-all duration-200 ${
                  location.pathname === link.to
                    ? "text-[var(--color-primary-950)] font-bold underline"
                    : ""
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-white bg-[var(--color-primary-900)] hover:bg-[var(--color-error-700)] px-4 py-2 rounded-lg font-semibold transition"
            >
              <AiOutlineLogout />
              تسجيل الخروج
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
