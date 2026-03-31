import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Language, type Translations, getTranslations } from "@/lib/translations";

interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  dark: boolean;
  toggleDark: () => void;
  t: Translations;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem("qoin_lang") as Language) ?? "en";
  });
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("qoin_dark") === "true";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("qoin_dark", String(dark));
  }, [dark]);

  useEffect(() => {
    const root = document.documentElement;
    const isRtl = lang === "ar";
    root.setAttribute("dir", isRtl ? "rtl" : "ltr");
    root.setAttribute("lang", lang);
    localStorage.setItem("qoin_lang", lang);
  }, [lang]);

  function setLang(l: Language) {
    setLangState(l);
  }

  function toggleDark() {
    setDark((v) => !v);
  }

  const t = getTranslations(lang);

  return (
    <AppContext.Provider value={{ lang, setLang, dark, toggleDark, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
