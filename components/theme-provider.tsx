"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  forceLightMode: boolean;
  setForceLightMode: (force: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeClass(t: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(t);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [forceLightMode, setForceLightMode] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const stored = localStorage.getItem("gorigo-theme");
    if (stored === "dark" || stored === "light") {
      setThemeState(stored);
      applyThemeClass(stored);
    } else {
      applyThemeClass("light");
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("gorigo-theme", t);
    applyThemeClass(forceLightMode ? "light" : t);
  }, [forceLightMode]);

  useEffect(() => {
    applyThemeClass(forceLightMode ? "light" : theme);
  }, [forceLightMode, theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, forceLightMode, setForceLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
