import { useState, useEffect } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("dtf-theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("dtf-theme", isDark ? "dark" : "light");
    } catch {}
  }, [isDark]);

  return { isDark, toggleTheme: () => setIsDark((d) => !d) };
}
