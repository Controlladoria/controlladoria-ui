"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";

type FontSize = "small" | "medium" | "large";
type DeviceType = "mobile" | "desktop";

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

function getDeviceType(): DeviceType {
  return window.innerWidth < 768 ? "mobile" : "desktop";
}

function getStorageKey(): string {
  return `fontSize_${getDeviceType()}`;
}

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");

  const applyFontSize = (size: FontSize) => {
    const root = document.documentElement;
    root.classList.remove("font-size-small", "font-size-medium", "font-size-large");
    root.classList.add(`font-size-${size}`);
  };

  // Load from user DB preferences (primary) or localStorage (fallback)
  useEffect(() => {
    const loadPreference = () => {
      const device = getDeviceType();
      let size: FontSize = "medium";

      if (isAuthenticated && user) {
        // Primary: DB-backed user preferences (per device type)
        const dbSize = device === "mobile"
          ? user.font_size_mobile
          : user.font_size_desktop;
        if (dbSize && ["small", "medium", "large"].includes(dbSize)) {
          size = dbSize as FontSize;
        }
      } else {
        // Fallback: localStorage for logged-out users
        const stored = localStorage.getItem(getStorageKey()) as FontSize | null;
        if (stored && ["small", "medium", "large"].includes(stored)) {
          size = stored;
        }
      }

      setFontSizeState(size);
      applyFontSize(size);
    };

    loadPreference();

    // Re-apply when crossing the mobile/desktop breakpoint
    let lastDevice = getDeviceType();
    const handleResize = () => {
      const currentDevice = getDeviceType();
      if (currentDevice !== lastDevice) {
        lastDevice = currentDevice;
        loadPreference();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [user, isAuthenticated]);

  const setFontSize = async (size: FontSize) => {
    setFontSizeState(size);
    applyFontSize(size);

    // Always cache to localStorage for instant load
    localStorage.setItem(getStorageKey(), size);

    // Persist to DB if authenticated
    if (isAuthenticated) {
      try {
        await api.patch("/auth/me/font-size", {
          size,
          device: getDeviceType(),
        });
      } catch (error) {
        console.error("Failed to save font size preference:", error);
      }
    }
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error("useFontSize must be used within FontSizeProvider");
  }
  return context;
}
