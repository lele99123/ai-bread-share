"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";

export default function ConfirmPage() {
  const router = useRouter();
  const { t } = useLanguage();

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
        <h2 style={{ fontFamily: "var(--font-playfair), serif", marginBottom: "8px" }}>{t("auth.signingIn")}</h2>
        <p style={{ color: "var(--text-muted)" }}>{t("auth.confirming")}</p>
      </div>
    </div>
  );
}
