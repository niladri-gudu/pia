"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "pia-theme";

/**
 * Toggle between light and dark. The initial theme comes from the system
 * preference (see the init script in the root layout) and the choice is
 * persisted to localStorage. Icon visibility is CSS-driven so no client
 * state or hydration handling is needed.
 */
export function ThemeToggle() {
  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");

    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    } catch {
      // Persistence is best-effort; the visual toggle still works.
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle color theme">
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
    </Button>
  );
}
