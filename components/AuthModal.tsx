"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";

type Mode = "signin" | "signup";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode("signin");
      setSent(false);
      setEmail("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (session) onClose();
  }, [session, onClose]);

  if (!open) return null;

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/confirm` },
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/confirm` },
    });
  }

  async function handleGithub() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/confirm` },
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "420px",
          maxWidth: "calc(100vw - 32px)",
          background: "var(--bg-card)",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          zIndex: 101,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => { setMode("signin"); setSent(false); setError(null); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "1rem", fontWeight: 600,
                color: mode === "signin" ? "var(--text)" : "var(--text-faint)",
                padding: "4px 0",
                borderBottom: mode === "signin" ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode("signup"); setSent(false); setError(null); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "1rem", fontWeight: 600,
                color: mode === "signup" ? "var(--text)" : "var(--text-faint)",
                padding: "4px 0",
                borderBottom: mode === "signup" ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              Sign up
            </button>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", padding: "4px" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: "48px", height: "48px", background: "var(--accent-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5 9-9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.25rem", marginBottom: "8px" }}>
                Check your email
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                We sent a link to <strong>{email}</strong>
              </p>
              <p style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: "8px" }}>
                Click the link in the email to {mode === "signup" ? "create your account" : "sign in"}.
              </p>
            </div>
          ) : (
            <>
              {/* OAuth buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                <button onClick={handleGoogle} className="btn-ghost" style={{ width: "100%", justifyContent: "center", gap: "10px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
                <button onClick={handleGithub} className="btn-ghost" style={{ width: "100%", justifyContent: "center", gap: "10px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.06 12.06 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", color: "var(--text-faint)", fontSize: "0.8rem" }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                or
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              </div>

              <form onSubmit={handleEmailSubmit}>
                <div style={{ marginBottom: "12px" }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="input"
                  />
                </div>
                {error && <p style={{ color: "var(--accent)", fontSize: "0.8rem", marginBottom: "8px" }}>{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  {loading ? "..." : mode === "signup" ? "Create Account" : "Sign in with Email"}
                </button>
              </form>

              <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", textAlign: "center", marginTop: "16px", lineHeight: 1.5 }}>
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
