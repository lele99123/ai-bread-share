"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Review } from "@/types";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth-provider";
import { AuthModal } from "@/components/AuthModal";

interface ReviewWithDetails {
  id: string;
  recipe_id?: string;
  branch_id?: string | null;
  author_name: string;
  author_id: string | null;
  rating: number;
  accuracy_rating: number | null;
  comment: string | null;
  comment_en: string | null;
  comment_cn: string | null;
  is_owner_review: boolean;
  created_at: string;
  updated_at: string | null;
  recipe_title?: string;
  branch_title?: string;
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

export default function MyReviews() {
  const { t, locale } = useLanguage();
  const session = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      setAuthModalOpen(true);
      return;
    }
    if (!session.user?.id) return;

    supabase
      .from("reviews")
      .select(`
        *,
        recipe_branches (
          id,
          title,
          title_en,
          title_cn,
          recipe_id,
          recipes (
            title,
            title_en,
            title_cn
          )
        )
      `)
      .eq("author_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const reviewsWithDetails = (data as any[]).map((review) => {
            const branch = review.recipe_branches;
            const recipe = branch?.recipes;
            return {
              ...review,
              recipe_title: recipe ? getLocalizedField(recipe, locale, "title_en", "title_cn", "title") : "",
              branch_title: branch ? getLocalizedField(branch, locale, "title_en", "title_cn", "title") : "",
              branch_id: branch?.id || null,
              recipe_id: branch?.recipe_id || review.recipe_id,
            };
          });
          setReviews(reviewsWithDetails as ReviewWithDetails[]);
        }
        setLoading(false);
      });
  }, [session, locale]);

  if (!session) {
    return (
      <div className="container" style={{ paddingTop: "80px", paddingBottom: "80px", textAlign: "center" }}>
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
          <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.75rem", marginBottom: "16px" }}>{t("myReviews.title")}</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>{t("myReviews.signInToView")}</p>
          <button className="btn-primary" onClick={() => setAuthModalOpen(true)}>{t("nav.signIn")}</button>
        </div>
        <AuthModal open={authModalOpen} onClose={() => { setAuthModalOpen(false); router.push("/"); }} />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>{t("myReviews.title")}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {reviews.length} {reviews.length === 1 ? t("myReviews.review_one") : t("myReviews.review_other")}
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "100px", borderRadius: "12px" }} />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-faint)" }}>
            <p style={{ fontSize: "1rem", marginBottom: "16px" }}>{t("myReviews.noReviews")}</p>
            <Link href="/" className="btn-primary">{t("myReviews.browseRecipes")}</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {reviews.map((review) => (
              <div key={review.id} className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    {review.branch_id ? (
                      <Link
                        href={`/recipes/${review.recipe_id}?branch=${review.branch_id}`}
                        style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text)", textDecoration: "none" }}
                      >
                        {review.branch_title || review.recipe_title || t("myReviews.viewRecipe")}
                      </Link>
                    ) : (
                      <p style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text)" }}>
                        {review.recipe_title || t("myReviews.recipe")}
                      </p>
                    )}
                    <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: "2px" }}>
                      {new Date(review.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      {review.accuracy_rating && (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {t("recipe.accuracyRating")}: ★{review.accuracy_rating}
                        </span>
                      )}
                      <span style={{ color: "#F59E0B", letterSpacing: "1px" }}>
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </span>
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
