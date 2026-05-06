"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Recipe } from "@/types";
import { useLanguage } from "@/lib/language";

const AI_MODELS = ["All", "Gemini", "ChatGPT", "Claude", "DeepSeek", "Other"];
const BREAD_TYPES = ["All", "Sweet", "Savory", "Sourdough", "Other"];

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
      {/* Photo */}
      <div style={{ height: '220px', background: 'var(--bg-muted)', position: 'relative', overflow: 'hidden' }}>
        {displayBranch?.outcome_photo_url ? (
          <img
            src={displayBranch.outcome_photo_url}
            alt={displayBranch.title}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.3s ease',
            }}
            className="group-hover:scale-105"
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.25 }}>
              <ellipse cx="28" cy="38" rx="22" ry="12" fill="var(--text)"/>
              <ellipse cx="28" cy="30" rx="18" ry="9" fill="var(--text)"/>
              <ellipse cx="28" cy="23" rx="14" ry="7" fill="var(--text)"/>
            </svg>
          </div>
        )}
        {/* Badges overlay */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {displayBranch && (
            <span className={`ai-badge ${modelClass}`}>{recipe.ai_model}</span>
          )}
          {branchCount > 1 && (
            <span style={{
              background: 'rgba(0,0,0,0.5)', color: 'white',
              fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '9999px',
              fontWeight: 600,
            }}>
              {branchCount} {t("home.variants")}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {displayBranch?.bread_type && (
          <p className="section-label" style={{ marginBottom: '6px' }}>{displayBranch.bread_type}</p>
        )}
        <h3 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.0625rem',
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: '6px',
          lineHeight: 1.3,
        }}>
          {getLocalizedField(displayBranch || recipe as any, locale, "title_en", "title_cn", "title")}
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '10px' }}>
          by {recipe.author_name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {displayBranch?.review_count !== undefined && displayBranch.review_count > 0 ? (
            <>
              <Stars rating={displayBranch.avg_rating || 0} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                ({displayBranch.review_count})
              </span>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{t("home.noReviews")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { t, locale } = useLanguage();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState("All");
  const [selectedType, setSelectedType] = useState("All");

  useEffect(() => {
    supabase
      .from("recipes")
      .select(`
        *,
        recipe_branches (
          *,
          reviews (rating)
        )
      `)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setRecipes(data.map((r: any) => {
            const branches = (r.recipe_branches || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
            const enriched = branches.map((b: any) => {
              const reviews = b.reviews || [];
              const avg = reviews.length ? reviews.reduce((s: number, rv: any) => s + rv.rating, 0) / reviews.length : 0;
              return { ...b, avg_rating: avg, review_count: reviews.length };
            });
            return { ...r, branches: enriched };
          }));
        }
        setLoading(false);
      });
  }, []);

  const filtered = recipes.filter((r) => {
    const primary = r.branches?.[0];
    if (selectedModel !== "All" && primary && !primary.ai_model.toLowerCase().includes(selectedModel.toLowerCase())) return false;
    if (selectedType !== "All" && primary && primary.bread_type !== selectedType) return false;
    return true;
  });

  return (
    <div className="container" style={{ paddingTop: '48px', paddingBottom: '64px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '48px', maxWidth: '600px' }} className="home-header">
        <p className="section-label" style={{ marginBottom: '12px' }}>{t("home.label")}</p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.02em' }}>
          {t("home.title")}<br />
          <em style={{ color: 'var(--accent)' }}>{t("home.titleAccent")}</em>
        </h1>
        <p style={{ fontSize: '1.0625rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: '480px' }}>
          {t("home.description")}
        </p>
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '24px',
        marginBottom: '40px', paddingBottom: '24px',
        borderBottom: '1px solid var(--border)',
      }} className="filter-row">
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>{t("home.filterModel")}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {AI_MODELS.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedModel(m)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: '1px solid',
                  ...(selectedModel === m
                    ? { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }
                    : { background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border)' }),
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>{t("home.filterType")}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {BREAD_TYPES.map((t_) => (
              <button
                key={t_}
                onClick={() => setSelectedType(t_)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: '1px solid',
                  ...(selectedType === t_
                    ? { background: 'var(--text)', color: 'white', borderColor: 'var(--text)' }
                    : { background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border)' }),
                }}
              >
                {t_}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }} className="recipe-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div className="skeleton" style={{ height: '220px' }} />
              <div style={{ padding: '20px' }}>
                <div className="skeleton" style={{ height: '14px', width: '60px', marginBottom: '12px' }} />
                <div className="skeleton" style={{ height: '20px', width: '80%', marginBottom: '8px' }} />
                <div className="skeleton" style={{ height: '14px', width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ marginBottom: '16px' }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }}>
              <ellipse cx="32" cy="44" rx="26" ry="14" fill="var(--text)"/>
              <ellipse cx="32" cy="35" rx="21" ry="10" fill="var(--text)"/>
              <ellipse cx="32" cy="27" rx="16" ry="8" fill="var(--text)"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', marginBottom: '8px' }}>{t("home.noRecipes")}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>{t("home.firstToShare")}</p>
          <Link href="/submit" className="btn-primary" style={{ display: 'inline-flex' }}>
            {t("home.shareBtn")}
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}