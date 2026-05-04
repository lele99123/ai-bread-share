"use client";

import { useLanguage } from "@/lib/language";

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "zh" : "en")}
      style={{
        padding: "5px 10px",
        borderRadius: "6px",
        border: "1px solid var(--border)",
        background: "transparent",
        color: "var(--text-muted)",
        fontSize: "0.75rem",
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: "0.05em",
      }}
    >
      {locale === "en" ? "中文" : "EN"}
    </button>
  );
}