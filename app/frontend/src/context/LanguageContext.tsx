import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { translations, type Language, type Translations, translateStopName } from "../i18n/translations";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
  translateStop: (name: string) => string;
  translatePlate: (plate: string) => string;
}

const STORAGE_KEY = "buncch_app_language";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "kn" || saved === "en") return saved;
    return "kn"; // Default to Kannada
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useMemo(() => translations[lang], [lang]);

  const translateStop = (name: string) => translateStopName(name, lang);

  const translatePlate = (plate: string) => {
    return plate;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, translateStop, translatePlate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
