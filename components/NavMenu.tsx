"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-provider";
import { useLanguage } from "@/lib/language";
import { AuthModal } from "./AuthModal";

export function NavMenu() {
  const session = useAuth();
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler, { passive: true });
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  async function handleSignOut() {
    const { supabase } = await import("@/lib/supabase");
    await supabase.auth.signOut();
    setOpen(false);
  }

  return (
    <>
      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(!open)}
          className="nav-menu-btn btn-ghost"
          style={{
            padding: "4px 8px",
            fontSize: "0.7rem",
          }}
          aria-label={t("nav.menu")}
          aria-expanded={open}
        >
          {open ? "✕" : "☰"}
        </button>

        {open && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.3)",
                zIndex: 90,
              }}
              onClick={() => setOpen(false)}
            />
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: "100%",
                right: "0",
                marginTop: "4px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                zIndex: 91,
                minWidth: "180px",
                overflow: "hidden",
              }}
            >
            {session ? (
              <>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginBottom: "2px" }}>{t("nav.signedInAs")}</p>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", wordBreak: "break-all" }}>
                    {session.user.email}
                  </p>
                </div>
                <div style={{ padding: "6px" }}>
                  <Link
                    href="/my-recipes"
                    onClick={() => setOpen(false)}
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      color: "var(--text)",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    {t("nav.myRecipes")}
                  </Link>
                  <Link
                    href="/my-reviews"
                    onClick={() => setOpen(false)}
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      color: "var(--text)",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    {t("nav.myReviews")}
                  </Link>
                  <Link
                    href="/benchmark"
                    onClick={() => setOpen(false)}
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      color: "var(--text)",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    {t("nav.benchmark")}
                  </Link>
                  <button
                    onClick={() => { setOpen(false); handleSignOut(); }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      background: "none",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      color: "var(--text)",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    {t("nav.signOut")}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: "6px" }}>
                <Link
                  href="/benchmark"
                  onClick={() => setOpen(false)}
                  style={{
                    display: "block",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "var(--text)",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  {t("nav.benchmark")}
                </Link>
                <button
                  onClick={() => { setOpen(false); setAuthOpen(true); }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "var(--text)",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  {t("nav.signIn")}
                </button>
              </div>
            )}
            </div>
          </>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
