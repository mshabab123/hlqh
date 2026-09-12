import { useEffect, useState } from "react";
import { AiOutlineMoon, AiOutlineSun } from "react-icons/ai";

const STORAGE_KEY = "hlqh-theme";
const THEME_CHANGE_EVENT = "hlqh-theme-change";

function readTheme() {
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

export default function ThemeToggle({ mobile = false, iconOnly = false, onChange }) {
  const [theme, setTheme] = useState(readTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    const syncTheme = (event) => {
      const nextTheme = event.detail || readTheme();
      setTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
    };
    const syncStoredTheme = () => syncTheme({ detail: readTheme() });

    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    window.addEventListener("storage", syncStoredTheme);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
      window.removeEventListener("storage", syncStoredTheme);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(STORAGE_KEY, nextTheme);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: nextTheme }));
    onChange?.(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${mobile ? "theme-toggle--mobile" : ""} ${iconOnly ? "theme-toggle--icon-only" : ""}`}
      aria-pressed={isDark}
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      {isDark ? <AiOutlineSun aria-hidden="true" /> : <AiOutlineMoon aria-hidden="true" />}
      {!iconOnly && <span>{isDark ? "فاتح" : "داكن"}</span>}
    </button>
  );
}
