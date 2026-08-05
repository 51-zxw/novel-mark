"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";
type FontSize = "sm" | "base" | "lg" | "xl";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = "novel-mark-theme";
const FONT_SIZE_KEY = "novel-mark-font-size";

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: "18px",
  base: "20px",
  lg: "22px",
  xl: "24px",
};

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}

function getInitialFontSize(): FontSize {
  if (typeof window === "undefined") return "base";
  const saved = localStorage.getItem(FONT_SIZE_KEY);
  if (saved === "sm" || saved === "base" || saved === "lg" || saved === "xl")
    return saved;
  return "base";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
  } else {
    root.classList.remove("light");
  }
}

function applyFontSize(size: FontSize) {
  const root = document.documentElement;
  root.style.setProperty("--font-size-base", FONT_SIZE_MAP[size]);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [fontSize, setFontSizeState] = useState<FontSize>(getInitialFontSize);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    applyFontSize(fontSize);
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  const value: ThemeContextValue = {
    theme,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    fontSize,
    setFontSize: setFontSizeState,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
