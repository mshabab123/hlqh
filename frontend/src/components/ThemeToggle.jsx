import { useEffect, useState } from "react";
import { AiOutlineMoon, AiOutlineSun } from "react-icons/ai";

const STORAGE_KEY = "hlqh-theme";

function readTheme() {
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

export default function ThemeToggle({ mobile = false }) {
  const [theme, setTheme] = useState(readTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`theme-toggle ${mobile ? "theme-toggle--mobile" : ""}`}
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      {isDark ? <AiOutlineSun aria-hidden="true" /> : <AiOutlineMoon aria-hidden="true" />}
      <span>{isDark ? "فاتح" : "داكن"}</span>
    </button>
  );
}
