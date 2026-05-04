"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";

export function AuthButton() {
  const session = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (session) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          {session.user.email}
        </span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="btn-ghost"
          style={{ fontSize: "0.8125rem", padding: "4px 10px" }}
        >
          Sign out
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
        Check your email for the link
      </span>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        await supabase.auth.signInWithOtp({ email });
        setLoading(false);
        setSent(true);
      }}
      style={{ display: "flex", alignItems: "center", gap: "6px" }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="input"
        style={{ fontSize: "0.8125rem", padding: "4px 10px", width: "180px" }}
      />
      <button type="submit" disabled={loading} className="btn-ghost" style={{ fontSize: "0.8125rem", padding: "4px 10px" }}>
        {loading ? "..." : "Sign in"}
      </button>
    </form>
  );
}
