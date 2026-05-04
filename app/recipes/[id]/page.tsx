"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";
import { Recipe, Review } from "@/types";

function getModelClass(model: string): string {
  const m = model.toLowerCase();
  if (m.includes("gemini"))    return "gemini";
  if (m.includes("chatgpt") || m.includes("gpt")) return "chatgpt";
  if (m.includes("claude"))    return "claude";
  if (m.includes("deepseek")) return "deepseek";
  return "other";
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{
            fontSize: '1.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            lineHeight: 1,
            color: n <= value ? '#F59E0B' : 'var(--border-dark)',
            transition: 'transform 0.1s ease',
          }}
          onMouseEnter={(e) => { if (n <= value) (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ author_name: "", rating: 0, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("recipes").select("*").eq("id", id).single(),
      supabase.from("reviews").select("*").eq("recipe_id", id).order("created_at", { ascending: false }),
    ]).then(([{ data: r }, { data: rv }]) => {
      setRecipe(r);
      setReviews((rv || []) as Review[]);
      setLoading(false);
    });
  }, [id]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!id || reviewForm.rating === 0) return;
    setSubmitting(true);
    const { data } = await supabase
      .from("reviews")
      .insert({ recipe_id: id, ...reviewForm })
      .select()
      .single();
    if (data) {
      setReviews([data as Review, ...reviews]);
      setReviewForm({ author_name: "", rating: 0, comment: "" });
      setReviewSubmitted(true);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '48px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="skeleton" style={{ height: '32px', width: '50%' }} />
          <div className="skeleton" style={{ height: '400px', borderRadius: '12px' }} />
          <div className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container" style={{ paddingTop: '48px', paddingBottom: '80px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', marginBottom: '16px' }}>Recipe not found</h1>
        <Link href="/" className="btn-primary">Back to home</Link>
      </div>
    );
  }

  const modelClass = getModelClass(recipe.ai_model);
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const metaStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    marginBottom: '32px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'center',
  };
  const sectionStyle: React.CSSProperties = {
    marginBottom: '40px',
  };
  const sectionTitle: React.CSSProperties = {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.375rem',
    fontWeight: 600,
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border)',
  };

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        {/* ── Back link ── */}
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '0.875rem', color: 'var(--text-muted)',
          textDecoration: 'none', marginBottom: '24px',
          fontFamily: "'DM Sans', sans-serif",
          transition: 'color 0.15s',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          All recipes
        </Link>

        {/* ── Title block ── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span className={`ai-badge ${modelClass}`}>{recipe.ai_model}</span>
            {recipe.bread_type && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                {recipe.bread_type}
              </span>
            )}
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            marginBottom: '16px',
          }}>
            {recipe.title}
          </h1>
          <p style={metaStyle}>
            <span>by <strong style={{ color: 'var(--text)' }}>{recipe.author_name}</strong></span>
            <span>·</span>
            <span>{new Date(recipe.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            {reviews.length > 0 && (
              <>
                <span>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#F59E0B', letterSpacing: '1px' }}>
                    {"★".repeat(Math.round(avgRating))}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                  </span>
                </span>
              </>
            )}
          </p>
        </div>

        {/* ── Outcome photo ── */}
        {recipe.outcome_photo_url && (
          <div style={{ borderRadius: '14px', overflow: 'hidden', marginBottom: '40px', border: '1px solid var(--border)' }}>
            <img
              src={recipe.outcome_photo_url}
              alt={recipe.title}
              style={{ width: '100%', maxHeight: '480px', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* ── Final Recipe ── */}
        {recipe.final_recipe && (
          <div style={sectionStyle}>
            <h2 style={sectionTitle}>Final Recipe</h2>
            <div className="card" style={{ padding: '28px 32px' }}>
              <div className="prose-bread">
                <ReactMarkdown>{recipe.final_recipe}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* ── Chat History ── */}
        <div style={sectionStyle}>
          <h2 style={sectionTitle}>AI Conversation</h2>
          <div style={{
            background: 'var(--bg-muted)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '28px 32px',
          }}>
            <div className="prose-bread">
              <ReactMarkdown>{recipe.chat_history}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* ── Reviews ── */}
        <div style={sectionStyle}>
          <h2 style={sectionTitle}>
            Community Reviews
            {reviews.length > 0 && (
              <span style={{
                marginLeft: '12px',
                fontSize: '0.875rem',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                color: 'var(--text-muted)',
              }}>
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </span>
            )}
          </h2>

          {/* Review form */}
          <div className="card" style={{ padding: '24px 28px', marginBottom: '28px' }}>
            <h3 style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: '16px',
            }}>
              Share your experience
            </h3>

            {!reviewSubmitted ? (
              <form onSubmit={submitReview}>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Your rating</p>
                  <StarPicker
                    value={reviewForm.rating}
                    onChange={(r) => setReviewForm({ ...reviewForm, rating: r })}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Your name (optional)"
                    value={reviewForm.author_name}
                    onChange={(e) => setReviewForm({ ...reviewForm, author_name: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="How did it turn out? Any tips for others?"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || reviewForm.rating === 0}
                  className="btn-primary"
                  style={{ fontSize: '0.875rem', padding: '10px 20px' }}
                >
                  {submitting ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            ) : (
              <div style={{
                background: 'var(--bg-muted)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10l4 4 8-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Thanks for your review!
              </div>
            )}
          </div>

          {/* Review list */}
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)' }}>
              <p style={{ fontSize: '0.9375rem' }}>No reviews yet. Be the first to share your experience.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {reviews.map((review, i) => (
                <div key={review.id} style={{
                  padding: '20px 0',
                  borderBottom: i < reviews.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)' }}>
                        {review.author_name || "Anonymous"}
                      </span>
                      <span style={{ color: '#F59E0B', letterSpacing: '1px', fontSize: '0.875rem' }}>
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
