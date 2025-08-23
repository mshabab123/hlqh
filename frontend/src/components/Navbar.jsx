import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AiOutlineMenu,
  AiOutlineClose,
  AiOutlineLogin,
  AiOutlineUserAdd,
  AiOutlineTeam,
  AiOutlineBook,
  AiOutlineInfoCircle,
} from "react-icons/ai";

const navLinks = [
  { to: "/login", label: "الدخول", icon: <AiOutlineLogin />, primary: true },
  {
    to: "/registration",
    label: "التسجيل في الحقات",
    icon: <AiOutlineUserAdd />,
  },
  { to: "/TeacherRegister", label: "تسجيل معلم", icon: <AiOutlineTeam /> },
  { to: "/about", label: "عن المنصة", icon: <AiOutlineInfoCircle /> },
];

export default function Navbar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav
      className="w-full bg-gradient-to-l from-[var(--color-primary-100)] via-[var(--color-primary-400)] to-[var(--color-primary-700)] text-white shadow-xl sticky top-0 z-50"
      dir="rtl"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo + App name */}
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <img
              src="/logo.svg"
              alt="شعار المنصة"
              className="h-12 w-12 object-contain rounded-full shadow-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm"
              loading="lazy"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-xl md:text-2xl tracking-tight drop-shadow-md">
                منصة الحلقات
              </span>
              <span className="text-xs text-white/80 font-medium hidden md:block">
                نظام إدارة الحلقات القرآنية
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:bg-white/10 hover:shadow-md ${
                  location.pathname === link.to
                    ? "bg-white/20 text-white font-bold shadow-md"
                    : "text-white/90 hover:text-white"
                } ${link.primary ? "bg-white/15 border border-white/30" : ""}`}
              >
                <span className="text-lg">{link.icon}</span>
                <span className="text-sm font-semibold">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="فتح القائمة"
          >
            {isMobileMenuOpen ? (
              <AiOutlineClose className="h-6 w-6" />
            ) : (
              <AiOutlineMenu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isMobileMenuOpen ? "max-h-96 pb-4" : "max-h-0"
          }`}
        >
          <div className="flex flex-col gap-2 pt-2 border-t border-white/20">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  location.pathname === link.to
                    ? "bg-white/20 text-white font-bold"
                    : "text-white/90 hover:bg-white/10 hover:text-white"
                } ${link.primary ? "border border-white/30" : ""}`}
              >
                <span className="text-xl">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
