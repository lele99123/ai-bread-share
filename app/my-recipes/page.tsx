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
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.25 }}>
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
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      setAuthModalOpen(true);
      return;
    }
    if (!session.user?.id) return;

    supabase
      .from("recipes")
      .select(`
        *,
        recipe_branches (
          *,
          reviews (rating)
        )
      `)
      .eq("author_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
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
        setLoading(false);
      });
  }, [session]);

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

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {[1,2,3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "320px", borderRadius: "12px" }} />
            ))}
          </div>
        ) : recipes.length === 0 ? (
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
