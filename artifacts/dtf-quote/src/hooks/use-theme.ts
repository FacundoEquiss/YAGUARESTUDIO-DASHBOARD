import { useState, useEffect, useCallback } from "react";

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
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("dtf-theme", isDark ? "dark" : "light");
    } catch {}
  }, [isDark]);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const dark = root.classList.contains("dark");
      setIsDark(prev => prev !== dark ? dark : prev);
    });
    observer.observe(root, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return { isDark, toggleTheme: () => setIsDark(d => !d) };
}
