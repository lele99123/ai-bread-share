"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    // Handle the OAuth or OTP callback
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/");
      } else {
        router.push("/");
      }
    });
  }, [router]);

  return (
    <div className="container" style={{ paddingTop: "80px", textAlign: "center" }}>
      <div style={{ maxWidth: "400px", margin: "0 auto" }}>
        <div style={{ width: "48px", height: "48px", background: "var(--accent-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5 9-9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontFamily: "var(--font-playfair), serif", marginBottom: "8px" }}>Signing you in...</h2>
        <p style={{ color: "var(--text-muted)" }}>Please wait while we confirm your account.</p>
      </div>
    </div>
  );
}
