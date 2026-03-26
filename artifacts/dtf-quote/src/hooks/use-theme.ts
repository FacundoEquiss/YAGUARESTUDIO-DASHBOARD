import { useEffect } from "react";

export function useTheme() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return { isDark: true as const, toggleTheme: () => {} };
}
