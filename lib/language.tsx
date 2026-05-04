"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import en from "@/i18n/messages/en.json";
import zh from "@/i18n/messages/zh.json";

const translations = { en, zh };

type Locale = "en" | "zh";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  t: () => "",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale;
    if (saved && (saved === "en" || saved === "zh")) {
      setLocaleState(saved);
    }
  }, []);

  function setLocale(locale: Locale) {
    setLocaleState(locale);
    localStorage.setItem("locale", locale);
    document.documentElement.lang = locale;
  }

  function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split(".");
    let value: any = translations[locale];
    for (const k of keys) {
      value = value?.[k];
    }
    // Handle plural keys like "submit.publish_one" / "submit.publish_other"
    if (typeof value !== "string" && (key.endsWith("_one") || key.endsWith("_other"))) {
      const baseKey = key.substring(0, key.lastIndexOf("_"));
      const count = params?.count as number;
      const pluralKey = count === 1 ? baseKey + "_one" : baseKey + "_other";
      let pluralValue: any = translations[locale];
      for (const k of pluralKey.split(".")) {
        pluralValue = pluralValue?.[k];
      }
      if (typeof pluralValue === "string") {
        value = pluralValue;
      }
    }
    if (typeof value !== "string") return key;
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
    }
    return value;
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}