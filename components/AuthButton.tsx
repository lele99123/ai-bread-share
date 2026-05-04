"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-provider";
import { AuthModal } from "./AuthModal";
import { supabase } from "@/lib/supabase";

export function AuthButton() {
  const session = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

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

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="btn-ghost"
        style={{ fontSize: "0.8125rem", padding: "4px 10px" }}
      >
        Sign in
      </button>
      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
