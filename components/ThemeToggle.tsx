"use client";

import { useEffect, useState } from "react";

type ThemeToggleProps = {
  className?: string;
  compact?: boolean;
};

const STORAGE_KEY = "theme";

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next = stored ? stored === "dark" : media.matches;

    applyTheme(next);
    setIsDark(next);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const storedTheme = event.newValue;
      const updated = storedTheme ? storedTheme === "dark" : media.matches;
      applyTheme(updated);
      setIsDark(updated);
    };

    const handleSystemTheme = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
      applyTheme(event.matches);
      setIsDark(event.matches);
    };

    window.addEventListener("storage", handleStorage);
    media.addEventListener("change", handleSystemTheme);

    return () => {
      window.removeEventListener("storage", handleStorage);
      media.removeEventListener("change", handleSystemTheme);
    };
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    applyTheme(next);
    setIsDark(next);
  };

  return (
    <button
      type="button"
      aria-pressed={isDark}
      aria-label={isDark ? "Usar modo claro" : "Usar modo escuro"}
      onClick={toggleTheme}
      className={
        "theme-toggle nav-item inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-surface text-xs font-black text-ink-soft hover:bg-surface-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 " +
        (compact ? "px-2.5" : "px-3") +
        " " +
        className
      }
    >
      <span
        className="theme-track relative h-5 w-9 rounded-full border border-line bg-surface-2"
        aria-hidden="true"
      >
        <span
          className={
            "theme-thumb absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-brand-700 shadow-[0_8px_16px_-8px_rgba(92,34,232,0.8)] transition-transform duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] " +
            (isDark ? "translate-x-[18px]" : "translate-x-0.5")
          }
        />
      </span>
      {!compact && <span>{isDark ? "Claro" : "Escuro"}</span>}
    </button>
  );
}
