"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";
import { Recipe, RecipeBranch, Review } from "@/types";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth-provider";
import { AuthModal } from "@/components/AuthModal";

function getLocalizedField<T>(item: T, locale: "en" | "zh", fieldEn: keyof T, fieldCn: keyof T, fieldFallback: keyof T): string {
  if (locale === "zh") {
    const cn = item[fieldCn] as string | null;
    if (cn) return cn;
  }
  const en = item[fieldEn] as string | null;
  if (en) return en;
  return (item[fieldFallback] as string) || "";
}

function getModelClass(model: string): string {
  const m = model.toLowerCase();
  if (m.includes("gemini"))    return "gemini";
  if (m.includes("chatgpt") || m.includes("gpt")) return "chatgpt";
  if (m.includes("claude"))    return "claude";
  if (m.includes("deepseek")) return "deepseek";
  return "other";
}

function StarPicker({ value, onChange, label }: { value: number; onChange: (v: number) => void; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {label && <span style={{ fontSize: "0.8rem", color: "var(--text-faint)", minWidth: "80px" }}>{label}</span>}
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
    </div>
  );
}

function getLocalizedReviewComment(review: Review, locale: "en" | "zh"): string {
  if (locale === "zh") {
    return review.comment_cn || review.comment_en || review.comment || "";
  }
  return review.comment_en || review.comment || review.comment_cn || "";
}

function ReviewSection({ branchId, recipeId, recipeAuthorId }: { branchId: string; recipeId: string; recipeAuthorId: string | null }) {
  const { t, locale } = useLanguage();
  const session = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState({ accuracy_rating: 0, taste_rating: 0, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ accuracy_rating: 0, taste_rating: 0, comment: "" });

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
    if (reviewForm.taste_rating === 0 || !session) return;
    setSubmitting(true);
    const authorName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Anonymous";
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        branch_id: branchId,
        recipe_id: recipeId,
        author_name: authorName,
        rating: reviewForm.taste_rating,
        accuracy_rating: reviewForm.accuracy_rating || null,
        comment: reviewForm.comment,
        comment_en: reviewForm.comment,
        author_id: session.user.id,
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      alert("Failed to submit review: " + error.message);
      return;
    }
    if (data) {
      setReviews([data as Review, ...reviews]);
      setReviewForm({ accuracy_rating: 0, taste_rating: 0, comment: "" });
      setSubmitted(true);
    }
  }

  async function saveEdit(reviewId: string) {
    const { data, error } = await supabase
      .from("reviews")
      .update({
        rating: editForm.taste_rating,
        accuracy_rating: editForm.accuracy_rating || null,
        comment: editForm.comment,
        comment_en: editForm.comment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .select();
    if (error) {
      alert("Failed to update review: " + error.message);
      return;
    }
    if (data && data.length > 0) {
      setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, ...data[0] } as Review : r));
      setEditingReviewId(null);
    }
  }

  function startEdit(review: Review) {
    setEditingReviewId(review.id);
    setEditForm({
      accuracy_rating: review.accuracy_rating || 0,
      taste_rating: review.rating,
      comment: getLocalizedReviewComment(review, locale),
    });
  }

  const avgTaste = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", padding: "12px 16px", background: "var(--bg-muted)", borderRadius: "8px" }}>
        <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          {reviews.length === 0 ? t("recipe.noReviews") : `${reviews.length} review${reviews.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {!session ? (
        <div style={{ padding: "16px", background: "var(--bg-muted)", borderRadius: "8px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
          <button className="btn-ghost" onClick={() => document.dispatchEvent(new CustomEvent("open-auth-modal"))}>
            Sign in to leave a review
          </button>
        </div>
      ) : !submitted ? (
        <form onSubmit={submitReview} style={{ marginBottom: "24px" }}>
          <div className="card" style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>{t("recipe.leaveReview")}</p>
            <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <StarPicker value={reviewForm.accuracy_rating} onChange={(r) => setReviewForm({ ...reviewForm, accuracy_rating: r })} label={t("recipe.accuracyRating")} />
              <StarPicker value={reviewForm.taste_rating} onChange={(r) => setReviewForm({ ...reviewForm, taste_rating: r })} label={t("recipe.tasteRating")} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <textarea
                className="input"
                rows={2}
                placeholder={t("recipe.howDidItTurnOut")}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || reviewForm.taste_rating === 0}
              className="btn-primary"
              style={{ fontSize: "0.875rem", padding: "8px 18px" }}
            >
              {submitting ? t("recipe.submitting") : t("recipe.submitReview")}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ padding: "14px 18px", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M4 10l4 4 8-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t("recipe.thanksReview")}
        </div>
      )}

      {reviews.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: "0.9rem", padding: "20px 0" }}>
          {t("recipe.beFirstReview")}
        </p>
      ) : (
        <div>
          {reviews.map((review, i) => (
            <div key={review.id} style={{ padding: "16px 0", borderBottom: i < reviews.length - 1 ? "1px solid var(--border)" : "none" }}>
              {editingReviewId === review.id ? (
                <div className="card" style={{ padding: "16px" }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "12px" }}>{t("recipe.editReview")}</p>
                  <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <StarPicker value={editForm.accuracy_rating} onChange={(r) => setEditForm({ ...editForm, accuracy_rating: r })} label={t("recipe.accuracyRating")} />
                    <StarPicker value={editForm.taste_rating} onChange={(r) => setEditForm({ ...editForm, taste_rating: r })} label={t("recipe.tasteRating")} />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <textarea
                      className="input"
                      rows={2}
                      value={editForm.comment}
                      onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => saveEdit(review.id)} className="btn-primary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>{t("recipe.save")}</button>
                    <button onClick={() => setEditingReviewId(null)} className="btn-ghost" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>{t("recipe.cancel")}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>
                        {review.author_name || "Anonymous"}
                      </span>
                      {review.author_id === recipeAuthorId && session?.user?.id === recipeAuthorId && (
                        <span style={{ fontSize: "0.7rem", background: "var(--accent-light)", color: "var(--accent-dark)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                          {t("recipe.ownerBadge")}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {review.accuracy_rating && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
                          {t("recipe.accuracyRating")}: ★{review.accuracy_rating}
                        </span>
                      )}
                      <span style={{ color: "#F59E0B", letterSpacing: "1px", fontSize: "0.875rem" }}>
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </span>
                      {session?.user?.id === review.author_id && (
                        <button onClick={() => startEdit(review)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: "0.75rem", padding: "2px 4px" }}>
                          {t("recipe.editReview")}
                        </button>
                      )}
                      <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
                        {review.updated_at ? new Date(review.updated_at).toLocaleDateString() : new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {getLocalizedReviewComment(review, locale) && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>{getLocalizedReviewComment(review, locale)}</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = useLanguage();
  const session = useAuth();
  const [id, setId] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [branches, setBranches] = useState<RecipeBranch[]>([]);
  const [activeBranchIdx, setActiveBranchIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const handler = () => setModalOpen(true);
    document.addEventListener("open-auth-modal", handler);
    return () => document.removeEventListener("open-auth-modal", handler);
  }, []);

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("recipes").select("*").eq("id", id).single(),
      supabase.from("recipe_branches").select("*, reviews (rating)").eq("recipe_id", id).order("sort_order"),
    ]).then(([{ data: r }, { data: br }]) => {
      if (r) setRecipe(r as Recipe);
      const branchData = (br || []) as any[];
      setBranches(branchData.map((b: any) => {
        const reviews = b.reviews || [];
        const avg = reviews.length ? reviews.reduce((s: number, rv: any) => s + rv.rating, 0) / reviews.length : 0;
        return { ...b, reviews: [], avg_rating: avg, review_count: reviews.length } as RecipeBranch;
      }));
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/recommend?recipe_id=${id}&limit=4`)
      .then(r => r.json())
      .then(d => setRecommendations(d.recommendations || []))
      .catch(() => {});
  }, [id]);

  function scrollToChatLine(lineStart: number | null) {
    if (!chatRef.current) return;
    chatRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }

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
        <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2rem", marginBottom: "16px" }}>{t("recipe.notFound")}</h1>
        <Link href="/" className="btn-primary">{t("recipe.backHome")}</Link>
      </div>
    );
  }

  const activeBranch = branches[activeBranchIdx] || branches[0];
  const activeModelClass = activeBranch ? getModelClass(activeBranch.ai_model) : "other";

  const schemaOrg = activeBranch ? {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    "name": getLocalizedField(activeBranch, locale, "title_en", "title_cn", "title"),
    "description": recipe.description_en || recipe.description || "",
    "author": { "@type": "Person", "name": recipe.author_name },
    "datePublished": recipe.created_at,
    "recipeIngredient": [],
    "recipeInstructions": [{ "@type": "HowToStep", "text": getLocalizedField(activeBranch, locale, "final_recipe_en", "final_recipe_cn", "final_recipe") || "" }],
    "aggregateRating": activeBranch.avg_rating ? {
      "@type": "AggregateRating",
      "ratingValue": activeBranch.avg_rating.toFixed(1),
      "reviewCount": activeBranch.review_count || 0,
    } : undefined,
  } : null;

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
      {schemaOrg && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
      )}
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontSize: "0.875rem", color: "var(--text-muted)",
          textDecoration: "none", marginBottom: "24px",
          transition: "color 0.15s",
        }}>
          {t("recipe.back")}
        </Link>

        <div style={{ marginBottom: "28px" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginBottom: "8px" }}>
            {t("recipe.conversationBy")} <strong style={{ color: "var(--text)" }}>{recipe.author_name}</strong>
            {" · "}
            {new Date(recipe.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Branch Tabs */}
        {branches.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }} className="branch-tabs">
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
                  {getLocalizedField(branch, locale, "title_en", "title_cn", "title")}
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
                  {activeBranch.chat_line_start !== null && (
                    <button
                      onClick={() => scrollToChatLine(activeBranch.chat_line_start)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: "0.75rem", color: "var(--accent)", textDecoration: "underline",
                        padding: 0, marginLeft: "4px",
                      }}
                    >
                      {t("recipe.viewInChat")}
                    </button>
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
                  {getLocalizedField(activeBranch, locale, "title_en", "title_cn", "title")}
                </h1>

                {/* Recipe description */}
                {getLocalizedField(recipe as any, locale, "description_en", "description_cn", "description") && (
                  <div style={{ marginBottom: "20px", padding: "14px 18px", background: "var(--bg-muted)", borderRadius: "8px", fontSize: "0.9375rem", color: "var(--text-muted)", fontStyle: "italic", borderLeft: "3px solid var(--accent)" }}>
                    {getLocalizedField(recipe as any, locale, "description_en", "description_cn", "description")}
                  </div>
                )}

                {activeBranch.tags && activeBranch.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
                    {activeBranch.tags.map((tag) => (
                      <span key={tag} style={{ fontSize: "0.7rem", padding: "3px 8px", borderRadius: "4px", background: "var(--accent-light)", color: "var(--accent-dark)", fontWeight: 600 }}>{tag}</span>
                    ))}
                  </div>
                )}

                {/* Branch notes */}
                {getLocalizedField(activeBranch, locale, "notes_en", "notes_cn", "notes") && (
                  <div style={{ marginBottom: "20px", padding: "12px 16px", background: "var(--bg-muted)", borderRadius: "8px", fontSize: "0.875rem", color: "var(--text-muted)", borderLeft: "3px solid var(--border)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-faint)", display: "block", marginBottom: "2px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Baker&apos;s Notes</span>
                    {getLocalizedField(activeBranch, locale, "notes_en", "notes_cn", "notes")}
                  </div>
                )}

                {/* Photo upload — owner only, after creation */}
                {session?.user?.id === recipe?.author_id && (
                  <div style={{ marginBottom: "32px" }}>
                    {!activeBranch.outcome_photo_url ? (
                      <div>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Add your photo
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          id={`photo-upload-${activeBranch.id}`}
                          style={{ display: "none" }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const fd = new FormData();
                            fd.append("branch_id", activeBranch.id);
                            fd.append("photo", file);
                            const res = await fetch("/api/upload-photo", {
                              method: "POST",
                              headers: {
                                Authorization: `Bearer ${session.access_token}`,
                              },
                              body: fd,
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setBranches((prev) =>
                                prev.map((b) =>
                                  b.id === activeBranch.id
                                    ? { ...b, outcome_photo_url: data.outcome_photo_url }
                                    : b
                                )
                              );
                            } else {
                              const data = await res.json();
                              alert("Upload failed: " + (data.error || "Unknown error"));
                            }
                          }}
                        />
                        <label
                            htmlFor={`photo-upload-${activeBranch.id}`}
                            className="upload-zone"
                            style={{ cursor: "pointer", display: "block" }}
                          >
                            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Upload your bread photo</p>
                          </label>
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", textAlign: "center", padding: "8px" }}>
                        Photo uploaded
                      </div>
                    )}
                  </div>
                )}
                {activeBranch.outcome_photo_url && (
                  <div style={{ borderRadius: "14px", overflow: "hidden", marginBottom: "32px", border: "1px solid var(--border)", maxHeight: "420px" }}>
                    <Image
                      src={activeBranch.outcome_photo_url}
                      alt={activeBranch.title}
                      width={760}
                      height={420}
                      style={{ width: "100%", height: "auto", maxHeight: "420px", objectFit: "cover", display: "block" }}
                      priority
                    />
                  </div>
                )}

                {/* Recipe */}
                {(activeBranch.final_recipe || activeBranch.final_recipe_en || activeBranch.final_recipe_cn) && (
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
                        <ReactMarkdown>{getLocalizedField(activeBranch, locale, "final_recipe_en", "final_recipe_cn", "final_recipe")}</ReactMarkdown>
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
                  <ReviewSection key={activeBranch.id} branchId={activeBranch.id} recipeId={recipe?.id || ""} recipeAuthorId={recipe?.author_id || null} />
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

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid var(--border)" }}>
            <h2 style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "1.125rem",
              fontWeight: 600,
              marginBottom: "16px",
              color: "var(--text-muted)",
            }}>
              You might also like
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
              {recommendations.map(rec => (
                <Link key={rec.id} href={`/recipes/${rec.id}`} className="card" style={{ textDecoration: "none" }}>
                  <div style={{ height: "120px", background: "var(--bg-muted)", overflow: "hidden", position: "relative" }}>
                    {rec.outcome_photo_url ? (
                      <Image src={rec.outcome_photo_url} alt={rec.title} fill sizes="200px" style={{ objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="32" height="32" viewBox="0 0 56 56" fill="none" style={{ opacity: 0.2 }}>
                          <ellipse cx="28" cy="38" rx="22" ry="12" fill="var(--text)"/>
                          <ellipse cx="28" cy="30" rx="18" ry="9" fill="var(--text)"/>
                          <ellipse cx="28" cy="23" rx="14" ry="7" fill="var(--text)"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "12px" }}>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginBottom: "4px" }}>{rec.bread_type}</p>
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{rec.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Full conversation — collapsed by default */}
        <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setChatCollapsed(!chatCollapsed)}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "var(--font-playfair), serif",
              fontSize: "1.125rem", fontWeight: 600,
              color: "var(--text-muted)", padding: 0,
            }}
          >
            Full AI Conversation
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              style={{ transform: chatCollapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
            >
              <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {!chatCollapsed && (
            <div style={{
              background: "var(--bg-muted)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "24px 28px",
              marginTop: "16px",
            }}>
              <div className="prose-bread" style={{ fontSize: "0.875rem" }}>
                <div ref={chatRef}>
                  <ReactMarkdown>{recipe.chat_history}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>

        <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />

      </div>
    </div>
  );
}