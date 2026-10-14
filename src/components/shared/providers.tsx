"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

export type A11yPreferences = {
  fontScale?: "md" | "lg" | "xl";
  highContrast?: boolean;
  reduceMotion?: boolean;
};

const A11yContext = React.createContext<{
  prefs: A11yPreferences;
  setPrefs: (prefs: A11yPreferences) => void;
}>({ prefs: {}, setPrefs: () => {} });

export function useA11yPreferences() {
  return React.useContext(A11yContext);
}

const STORAGE_KEY = "genvity:a11y";

function applyToDocument(prefs: A11yPreferences) {
  const root = document.documentElement;
  root.dataset.fontScale = prefs.fontScale ?? "md";
  root.dataset.contrast = prefs.highContrast ? "high" : "normal";
  root.dataset.reduceMotion = prefs.reduceMotion ? "true" : "false";
}

export function Providers({ children, initialA11y }: { children: React.ReactNode; initialA11y?: A11yPreferences }) {
  const [prefs, setPrefsState] = React.useState<A11yPreferences>(initialA11y ?? {});

  React.useEffect(() => {
    // Preferências do perfil têm prioridade; sem login, usa o navegador.
    if (initialA11y) {
      applyToDocument(initialA11y);
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as A11yPreferences;
        // Sincroniza com armazenamento externo (localStorage) após a hidratação.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrefsState(parsed);
        applyToDocument(parsed);
      }
    } catch {
      // armazenamento indisponível (modo privado) — ignora
    }
  }, [initialA11y]);

  const setPrefs = React.useCallback((next: A11yPreferences) => {
    setPrefsState(next);
    applyToDocument(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignora
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <A11yContext.Provider value={{ prefs, setPrefs }}>
        <MotionConfig reducedMotion={prefs.reduceMotion ? "always" : "user"}>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </MotionConfig>
      </A11yContext.Provider>
    </ThemeProvider>
  );
}
