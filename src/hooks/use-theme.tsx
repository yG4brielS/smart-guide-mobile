import { useEffect, useState, useCallback } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "be-theme";

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? (localStorage.getItem(STORAGE_KEY) as ThemeMode | null)
      : null);
    const initial: ThemeMode =
      stored ??
      (typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const change = useCallback((mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const toggle = useCallback(() => {
    change(theme === "dark" ? "light" : "dark");
  }, [theme, change]);

  return { theme, setTheme: change, toggle };
}
