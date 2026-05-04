"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";
import { Recipe, RecipeBranch, Review } from "@/types";

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
    <div style={{ display: "flex", gap: "4px" }}>
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{
            fontSize: "1.5rem", background: "none", border: "none",
            cursor: "pointer", padding: "2px", lineHeight: 1,
            color: n <= value ? "#F59E0B" : "var(--border-dark)",
            transition: "transform 0.1s ease",
          }}
          onMouseEnter={(e) => { if (n <= value) (e.currentTarget as HTMLElement).style.transform = "scale(1.2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ReviewSection({ branchId, recipeId, authorName }: { branchId: string; recipeId: string; authorName: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState({ author_name: "", rating: 0, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setReviews((data || []) as Review[]));
  }, [branchId]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (reviewForm.rating === 0) return;
    setSubmitting(true);
    const { data } = await supabase
      .from("reviews")
      .insert({ branch_id: branchId, recipe_id: recipeId, ...reviewForm })
      .select()
      .single();
    if (data) {
      setReviews([data as Review, ...reviews]);
      setReviewForm({ author_name: "", rating: 0, comment: "" });
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", padding: "12px 16px", background: "var(--bg-muted)", borderRadius: "8px" }}>
        <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          {reviews.length === 0 ? "No reviews yet" : `${reviews.length} review${reviews.length !== 1 ? "s" : ""} · ★ ${avgRating.toFixed(1)}`}
        </span>
      </div>

      {/* Review form */}
      {!submitted ? (
        <form onSubmit={submitReview} style={{ marginBottom: "24px" }}>
          <div className="card" style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Leave a review</p>
            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginBottom: "6px" }}>Your rating</p>
              <StarPicker value={reviewForm.rating} onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                className="input"
                placeholder="Your name (optional)"
                value={reviewForm.author_name}
                onChange={(e) => setReviewForm({ ...reviewForm, author_name: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <textarea
                className="input"
                rows={2}
                placeholder="How did it turn out?"
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || reviewForm.rating === 0}
              className="btn-primary"
              style={{ fontSize: "0.875rem", padding: "8px 18px" }}
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ padding: "14px 18px", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M4 10l4 4 8-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Thanks for your review!
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: "0.9rem", padding: "20px 0" }}>
          Be the first to review this recipe.
        </p>
      ) : (
        <div>
          {reviews.map((review, i) => (
            <div key={review.id} style={{ padding: "16px 0", borderBottom: i < reviews.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>
                    {review.author_name || "Anonymous"}
                  </span>
                  {review.is_owner_review && (
                    <span style={{ fontSize: "0.7rem", background: "var(--accent-light)", color: "var(--accent-dark)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                      owner
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#F59E0B", letterSpacing: "1px", fontSize: "0.875rem" }}>
                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {review.comment && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [branches, setBranches] = useState<RecipeBranch[]>([]);
  const [activeBranchIdx, setActiveBranchIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("recipes").select("*").eq("id", id).single(),
      supabase.from("recipe_branches").select("*, reviews (rating)").eq("recipe_id", id).order("sort_order"),
    ]).then(([{ data: r }, { data: br }]) => {
      setRecipe(r);
      const branchData = (br || []) as any[];
      setBranches(branchData.map((b: any) => {
        const reviews = b.reviews || [];
        const avg = reviews.length ? reviews.reduce((s: number, rv: any) => s + rv.rating, 0) / reviews.length : 0;
        return { ...b, reviews: [], avg_rating: avg, review_count: reviews.length };
      }));
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="skeleton" style={{ height: "28px", width: "40%" }} />
          <div className="skeleton" style={{ height: "200px", borderRadius: "12px" }} />
          <div className="skeleton" style={{ height: "300px", borderRadius: "12px" }} />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container" style={{ paddingTop: "48px", paddingBottom: "80px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2rem", marginBottom: "16px" }}>Recipe not found</h1>
        <Link href="/" className="btn-primary">Back to home</Link>
      </div>
    );
  }

  const activeBranch = branches[activeBranchIdx] || branches[0];
  const activeModelClass = activeBranch ? getModelClass(activeBranch.ai_model) : "other";

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        {/* Back link */}
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontSize: "0.875rem", color: "var(--text-muted)",
          textDecoration: "none", marginBottom: "24px",
          transition: "color 0.15s",
        }}>
          ← All recipes
        </Link>

        {/* Title */}
        <div style={{ marginBottom: "28px" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginBottom: "8px" }}>
            Conversation by <strong style={{ color: "var(--text)" }}>{recipe.author_name}</strong>
            {" · "}
            {new Date(recipe.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Branch Tabs */}
        {branches.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
              {branches.map((branch, idx) => (
                <button
                  key={branch.id}
                  onClick={() => setActiveBranchIdx(idx)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    ...(idx === activeBranchIdx
                      ? { background: "var(--text)", color: "white", borderColor: "var(--text)" }
                      : { background: "transparent", color: "var(--text-muted)", borderColor: "var(--border)" }),
                  }}
                >
                  {branch.title}
                </button>
              ))}
            </div>

            {/* Active branch content */}
            {activeBranch && (
              <div>
                {/* Branch meta */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <span className={`ai-badge ${activeModelClass}`}>{activeBranch.ai_model}</span>
                  {activeBranch.bread_type && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                      {activeBranch.bread_type}
                    </span>
                  )}
                  {activeBranch.avg_rating !== undefined && activeBranch.review_count !== undefined && activeBranch.review_count > 0 && (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      ★ {activeBranch.avg_rating.toFixed(1)} ({activeBranch.review_count})
                    </span>
                  )}
                </div>

                {/* Branch title */}
                <h1 style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                  marginBottom: "24px",
                }}>
                  {activeBranch.title}
                </h1>

                {/* Photo */}
                {activeBranch.outcome_photo_url && (
                  <div style={{ borderRadius: "14px", overflow: "hidden", marginBottom: "32px", border: "1px solid var(--border)" }}>
                    <img
                      src={activeBranch.outcome_photo_url}
                      alt={activeBranch.title}
                      style={{ width: "100%", maxHeight: "420px", objectFit: "cover", display: "block" }}
                    />
                  </div>
                )}

                {/* Recipe */}
                {activeBranch.final_recipe && (
                  <div style={{ marginBottom: "40px" }}>
                    <h2 style={{
                      fontFamily: "var(--font-playfair), serif",
                      fontSize: "1.25rem",
                      fontWeight: 600,
                      marginBottom: "16px",
                      paddingBottom: "10px",
                      borderBottom: "1px solid var(--border)",
                    }}>
                      Recipe
                    </h2>
                    <div className="card" style={{ padding: "24px 28px" }}>
                      <div className="prose-bread">
                        <ReactMarkdown>{activeBranch.final_recipe}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviews for this branch */}
                <div>
                  <h2 style={{
                    fontFamily: "var(--font-playfair), serif",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    marginBottom: "16px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid var(--border)",
                  }}>
                    Reviews
                  </h2>
                  <ReviewSection
                    key={activeBranch.id}
                    branchId={activeBranch.id}
                    recipeId={recipe.id}
                    authorName={recipe.author_name}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {branches.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-faint)" }}>
            <p>No branches found.</p>
          </div>
        )}

        {/* Full conversation — always shown at bottom */}
        <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid var(--border)" }}>
          <h2 style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "16px",
            color: "var(--text-muted)",
          }}>
            Full AI Conversation
          </h2>
          <div style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "24px 28px",
          }}>
            <div className="prose-bread" style={{ fontSize: "0.875rem" }}>
              <ReactMarkdown>{recipe.chat_history}</ReactMarkdown>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
