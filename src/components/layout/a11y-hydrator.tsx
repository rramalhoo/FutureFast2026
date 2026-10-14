"use client";

import { useEffect } from "react";
import { useA11yPreferences, type A11yPreferences } from "@/components/shared/providers";

/** Aplica as preferências de acessibilidade salvas no perfil. */
export function A11yHydrator({ prefs }: { prefs: A11yPreferences }) {
  const { setPrefs } = useA11yPreferences();
  const key = JSON.stringify(prefs);
  useEffect(() => {
    setPrefs(JSON.parse(key) as A11yPreferences);
  }, [key, setPrefs]);
  return null;
}
