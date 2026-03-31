"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  resolvedTheme: "light" | "dark"; // The actual theme being applied
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Initialize theme from user preference or localStorage
  useEffect(() => {
    if (isAuthenticated && user?.theme_preference) {
      setThemeState(user.theme_preference as Theme);
    } else {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored && ["light", "dark", "system"].includes(stored)) {
        setThemeState(stored);
      }
    }
  }, [user, isAuthenticated]);

  // Resolve system theme and apply
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      let effectiveTheme: "light" | "dark";

      if (theme === "system") {
        effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } else {
        effectiveTheme = theme;
      }

      // Apply or remove dark class
      if (effectiveTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      setResolvedTheme(effectiveTheme);
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    // Save to backend if authenticated
    if (isAuthenticated) {
      try {
        await api.patch("/auth/me/theme", { theme: newTheme });
      } catch (error) {
        console.error("Failed to save theme preference:", error);
        // Don't fail the theme change if backend fails
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
