"use client";

import { createContext, useContext, useEffect, useState } from "react";

import {
  isThemePreference,
  resolveThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/libs/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark() {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
  } catch {
    return false;
  }
}

function applyTheme(preference: ThemePreference) {
  const resolvedTheme = resolveThemePreference(preference, systemPrefersDark());
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const initialPreference = readStoredPreference();
      setPreferenceState(initialPreference);
      setResolvedTheme(applyTheme(initialPreference));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (preference !== "system") return;

    let mediaQuery: MediaQueryList | null = null;
    try {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return;
    }

    const handleChange = () => setResolvedTheme(applyTheme("system"));
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery?.removeEventListener("change", handleChange);
  }, [preference]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const nextPreference = isThemePreference(event.newValue) ? event.newValue : "system";
      setPreferenceState(nextPreference);
      setResolvedTheme(applyTheme(nextPreference));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function setPreference(nextPreference: ThemePreference) {
    setPreferenceState(nextPreference);
    setResolvedTheme(applyTheme(nextPreference));
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    } catch {
      // 隱私模式或停用儲存時仍保留本頁即時切換，重新載入後安全回到 system。
    }
  }

  return (
    <ThemeContext value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme 必須在 ThemeProvider 內使用");
  return context;
}
