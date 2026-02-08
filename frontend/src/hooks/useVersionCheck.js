import { useState, useEffect, useCallback } from "react";

const BUILD_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null;
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export default function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkVersion = useCallback(async () => {
    if (!BUILD_VERSION) return; // Skip in dev mode
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== BUILD_VERSION) {
        setUpdateAvailable(true);
      }
    } catch {
      // Silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkVersion]);

  // Also check when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [checkVersion]);

  const refresh = () => {
    window.location.reload();
  };

  return { updateAvailable, refresh };
}
