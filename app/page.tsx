"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Recipe } from "@/types";

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

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const modelClass = getModelClass(recipe.ai_model);

  return (
    <Link href={`/recipes/${recipe.id}`} className="card group block" style={{ textDecoration: 'none' }}>
      {/* Photo */}
      <div style={{ height: '220px', background: 'var(--bg-muted)', position: 'relative', overflow: 'hidden' }}>
        {recipe.outcome_photo_url ? (
          <img
            src={recipe.outcome_photo_url}
            alt={recipe.title}
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
        {/* Model badge overlay */}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          <span className={`ai-badge ${modelClass}`}>{recipe.ai_model}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {recipe.bread_type && (
          <p className="section-label" style={{ marginBottom: '8px' }}>{recipe.bread_type}</p>
        )}
        <h3 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: '8px',
          lineHeight: 1.3,
        }}>
          {recipe.title}
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '12px',
        }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {recipe.author_name}
          </span>
          {recipe.review_count !== undefined && recipe.review_count > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Stars rating={recipe.avg_rating || 0} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                ({recipe.review_count})
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>No reviews yet</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState("All");
  const [selectedType, setSelectedType] = useState("All");

  useEffect(() => {
    supabase
      .from("recipes")
      .select("*, reviews (rating)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setRecipes(data.map((r: any) => {
            const reviews = r.reviews || [];
            const avg = reviews.length
              ? reviews.reduce((s: number, rv: any) => s + rv.rating, 0) / reviews.length
              : 0;
            return { ...r, avg_rating: avg, review_count: reviews.length };
          }));
        }
        setLoading(false);
      });
  }, []);

  const filtered = recipes.filter((r) => {
    if (selectedModel !== "All" && !r.ai_model.toLowerCase().includes(selectedModel.toLowerCase())) return false;
    if (selectedType !== "All" && r.bread_type !== selectedType) return false;
    return true;
  });

  return (
    <div className="container" style={{ paddingTop: '48px', paddingBottom: '64px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '48px', maxWidth: '600px' }}>
        <p className="section-label" style={{ marginBottom: '12px' }}>Community Recipes</p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Bread recipes born<br />
          <em style={{ color: 'var(--accent)' }}>from a conversation.</em>
        </h1>
        <p style={{ fontSize: '1.0625rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: '480px' }}>
          Every recipe here starts with an AI chat. See what worked, what failed,
          and how real bakers adapted the conversation to their own kitchen.
        </p>
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '24px',
        marginBottom: '40px', paddingBottom: '24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>AI Model</p>
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
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Type</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {BREAD_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: '1px solid',
                  ...(selectedType === t
                    ? { background: 'var(--text)', color: 'white', borderColor: 'var(--text)' }
                    : { background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border)' }),
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
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
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', marginBottom: '8px' }}>No recipes yet</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>Be the first to share an AI bread conversation.</p>
          <Link href="/submit" className="btn-primary" style={{ display: 'inline-flex' }}>
            Share a Recipe
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
