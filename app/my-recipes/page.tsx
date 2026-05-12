"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Recipe } from "@/types";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth-provider";
import { AuthModal } from "@/components/AuthModal";

function getModelClass(model: string): string {
  const m = model.toLowerCase();
  if (m.includes("gemini"))   return "gemini";
  if (m.includes("chatgpt") || m.includes("gpt")) return "chatgpt";
  if (m.includes("claude"))   return "claude";
  if (m.includes("deepseek")) return "deepseek";
  return "other";
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating.toFixed(1)} out of 5`}>
      {[1,2,3,4,5].map((n) => (
        <span key={n} className={n <= Math.round(rating) ? "stars" : "stars-empty"}>★</span>
      ))}
    </span>
  );
}

function getLocalizedField<T>(item: T, locale: "en" | "zh", fieldEn: keyof T, fieldCn: keyof T, fieldFallback: keyof T): string {
  if (locale === "zh") {
    const cn = item[fieldCn] as string | null;
    if (cn) return cn;
  }
  const en = item[fieldEn] as string | null;
  if (en) return en;
  return (item[fieldFallback] as string) || "";
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { t, locale } = useLanguage();
  const modelClass = getModelClass(recipe.ai_model);
  const branchCount = recipe.branches?.length || 0;
  const branchWithPhoto = recipe.branches?.find((b) => b.outcome_photo_url);
  const displayBranch = branchWithPhoto || recipe.branches?.[0];

  return (
    <Link href={`/recipes/${recipe.id}`} className="card group block" style={{ textDecoration: 'none' }}>
      <div style={{ height: '220px', background: 'var(--bg-muted)', position: 'relative', overflow: 'hidden' }}>
        {displayBranch?.outcome_photo_url ? (
          <img
            src={displayBranch.outcome_photo_url}
            alt={displayBranch.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
            className="group-hover:scale-105"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ opacity: 0.25 }}>
              <ellipse cx="28" cy="38" rx="22" ry="12" fill="var(--text)"/>
              <ellipse cx="28" cy="30" rx="18" ry="9" fill="var(--text)"/>
              <ellipse cx="28" cy="23" rx="14" ry="7" fill="var(--text)"/>
            </svg>
          </div>
        )}
        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {displayBranch && (
            <span className={`ai-badge ${modelClass}`}>{recipe.ai_model}</span>
          )}
          {branchCount > 1 && (
            <span style={{ background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>
              {branchCount} {t("home.variants")}
            </span>
          )}
        </div>
      </div>
      <div style={{ padding: '20px' }}>
        {displayBranch?.bread_type && (
          <p className="section-label" style={{ marginBottom: '6px' }}>{displayBranch.bread_type}</p>
        )}
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text)', marginBottom: '6px', lineHeight: 1.3 }}>
          {getLocalizedField(displayBranch || recipe as any, locale, "title_en", "title_cn", "title")}
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '10px' }}>
          by {recipe.author_name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {displayBranch?.review_count !== undefined && displayBranch.review_count > 0 ? (
            <>
              <Stars rating={displayBranch.avg_rating || 0} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>({displayBranch.review_count})</span>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{t("home.noReviews")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function MyRecipes() {
  const { t, locale } = useLanguage();
  const session = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      setAuthModalOpen(true);
      return;
    }
    if (!session.user?.id) return;

    const userId = session.user.id;
    const userEmail = session.user.email || "";
    const userName = session.user.user_metadata?.full_name || userEmail.split("@")[0];

    Promise.all([
      // Owned recipes
      supabase
        .from("recipes")
        .select(`*, recipe_branches (*, reviews (rating))`)
        .eq("author_id", userId)
        .order("created_at", { ascending: false }),
      // Unclaimed recipes by same author_name
      supabase
        .from("recipes")
        .select("id")
        .eq("author_name", userName)
        .is("author_id", null),
    ]).then(([{ data, error }, { data: unclaimedData }]) => {
      if (!error && data) {
        setRecipes(data.map((r: any) => {
          const branches = (r.recipe_branches || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
          const enriched = branches.map((b: any) => {
            const reviews = b.reviews || [];
            const avg = reviews.length ? reviews.reduce((s: number, rv: any) => s + rv.rating, 0) / reviews.length : 0;
            return { ...b, reviews: [], avg_rating: avg, review_count: reviews.length };
          });
          return { ...r, branches: enriched } as Recipe;
        }));
      }
      setUnclaimedCount(unclaimedData?.length || 0);
      setLoading(false);
    });
  }, [session]);

  async function claimOldRecipes() {
    if (!session || claiming) return;
    const userName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "";
    setClaiming(true);

    try {
      const res = await fetch("/api/claim-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: userName, user_id: session.user.id }),
      });
      const result = await res.json();
      if (result.success) {
        setUnclaimedCount(0);
        // Refresh owned recipes
        const { data } = await supabase
          .from("recipes")
          .select(`*, recipe_branches (*, reviews (rating))`)
          .eq("author_id", session.user.id)
          .order("created_at", { ascending: false });
        if (data) {
          setRecipes(data.map((r: any) => {
            const branches = (r.recipe_branches || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
            const enriched = branches.map((b: any) => {
              const reviews = b.reviews || [];
              const avg = reviews.length ? reviews.reduce((s: number, rv: any) => s + rv.rating, 0) / reviews.length : 0;
              return { ...b, reviews: [], avg_rating: avg, review_count: reviews.length };
            });
            return { ...r, branches: enriched } as Recipe;
          }));
        }
      }
    } catch (err) {
      console.error("Claim failed:", err);
    }
    setClaiming(false);
  }

  if (!session) {
    return (
      <div className="container" style={{ paddingTop: "80px", paddingBottom: "80px", textAlign: "center" }}>
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
          <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.75rem", marginBottom: "16px" }}>{t("myRecipes.title")}</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>{t("myRecipes.signInToView")}</p>
          <button className="btn-primary" onClick={() => setAuthModalOpen(true)}>{t("nav.signIn")}</button>
        </div>
        <AuthModal open={authModalOpen} onClose={() => { setAuthModalOpen(false); router.push("/"); }} />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>{t("myRecipes.title")}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {recipes.length} {recipes.length === 1 ? t("myRecipes.recipe_one") : t("myRecipes.recipe_other")}
          </p>
        </div>

        {/* Claim ownership banner */}
        {unclaimedCount > 0 && (
          <div style={{
            background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
            border: "1px solid #F59E0B",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}>
            <div>
              <p style={{ fontWeight: 600, color: "#92400E", marginBottom: "2px" }}>
                {locale === "zh"
                  ? `你有 ${unclaimedCount} 个旧食谱尚未认领`
                  : `You have ${unclaimedCount} anonymous recipe${unclaimedCount > 1 ? "s" : ""} to claim`}
              </p>
              <p style={{ fontSize: "0.8rem", color: "#B45309", margin: 0 }}>
                {locale === "zh"
                  ? "点击按钮将它们关联到你的账户"
                  : "Claim them to manage them under your account"}
              </p>
            </div>
            <button
              onClick={claimOldRecipes}
              disabled={claiming}
              style={{
                background: "#F59E0B", color: "white",
                border: "none", borderRadius: "8px",
                padding: "10px 20px", fontWeight: 600,
                cursor: claiming ? "not-allowed" : "pointer",
                opacity: claiming ? 0.7 : 1,
                fontSize: "0.875rem",
              }}
            >
              {claiming ? (locale === "zh" ? "认领中..." : "Claiming...") : (locale === "zh" ? `认领 ${unclaimedCount} 个` : `Claim ${unclaimedCount}`)}
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {[1,2,3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "320px", borderRadius: "12px" }} />
            ))}
          </div>
        ) : recipes.length === 0 && unclaimedCount === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-faint)" }}>
            <p style={{ fontSize: "1rem", marginBottom: "16px" }}>{t("myRecipes.noRecipes")}</p>
            <Link href="/submit" className="btn-primary">{t("myRecipes.shareFirst")}</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
