"use client";

import { ReactNode } from "react";
import { AuthButton } from "@/components/AuthButton";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NavMenu } from "@/components/NavMenu";
import { useLanguage } from "@/lib/language";

const GITHUB_URL = "https://github.com/lele99123/ai-bread-share";

export function SiteChrome({ children }: { children: ReactNode }) {
  const { t } = useLanguage();

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo" aria-label="AI Bread Share">
            AI Bread <span>Share</span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/" className="btn-ghost nav-browse-btn" style={{ fontSize: "0.8125rem" }}>
              <span>{t("nav.browse")}</span>
            </a>
            <a href="/benchmark" className="btn-ghost nav-benchmark-btn" style={{ fontSize: "0.8125rem" }}>
              <span>{t("nav.benchmark")}</span>
            </a>
            <a href="/submit" className="btn-primary nav-share-btn">
              <span>{t("nav.share")}</span>
            </a>
            <LanguageToggle />
            <div className="auth-desktop">
              <AuthButton />
            </div>
            <NavMenu />
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "0.9375rem", marginBottom: "4px" }}>
              AI Bread Share
            </p>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-faint)" }}>{t("footer.tagline")}</p>
          </div>
          <div className="footer-links">
            <a href="/" className="footer-link">{t("nav.browse")}</a>
            <a href="/submit" className="footer-link">{t("nav.share")}</a>
            <a href="/benchmark" className="footer-link">{t("nav.benchmark")}</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
          </div>
        </div>
      </footer>
    </>
  );
}
