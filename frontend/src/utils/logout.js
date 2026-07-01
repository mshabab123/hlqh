// Shared logout helper. Revokes the current session server-side (best-effort),
// then clears local auth state.
const API_BASE = import.meta.env.VITE_API_BASE || "";

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

export async function performLogout() {
  const token = localStorage.getItem("token");
  const csrfToken = getCookie("csrf_token");
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (csrfToken) {
    headers["X-CSRF-Token"] = decodeURIComponent(csrfToken);
  }

  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers,
    });
  } catch {
    // Ignore network errors; local auth state is still cleared below.
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
