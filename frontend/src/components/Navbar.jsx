import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/login", label: "تسجيل الدخول" },
  { to: "/about", label: "عن المنصة" },
  { to: "/registration", label: "تسجيل ولي امر او طالب" },
  { to: "/TeacherRegister", label: "تسجيل معلم" },
  { to: "/schoolRegister", label: "طلب تسجيل مجمع حلقات" },
];

export default function Navbar() {
  const location = useLocation();
  return (
    <nav className="w-full bg-gradient-to-l from-[var(--color-primary-100)] via-[var(--color-primary-400)] to-[var(--color-primary-700)] text-white py-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between px-4">
        {/* Logo + App name */}
        <div className="flex items-center gap-3">
          <img
            src={"/public/logo.svg"}
            alt="شعار المنصة"
            className="h-12 w-12 object-contain rounded-full shadow-md border-2 border-white"
            loading="lazy"
          />
          <span className="font-extrabold text-2xl md:text-3xl tracking-tight drop-shadow-sm">
            منصة الحلقات
          </span>
        </div>
        <ul className="flex gap-8 text-lg font-medium">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`hover:underline transition-all duration-200 ${
                  location.pathname === link.to
                    ? "text-[var(--color-primary-950)] font-bold underline"
                    : ""
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
