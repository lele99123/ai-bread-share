"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";

interface BranchWithReview {
  id: string;
  ai_model: string;
  title: string;
  recipe_id: string;
  rating?: number;
  accuracy_rating?: number;
  comment?: string;
  created_at?: string;
}

export default function BenchmarkPage() {
  const { t, locale } = useLanguage();
  const [data, setData] = useState<Record<string, {
    recipes: number;
    reviews: number;
    avgTaste: number;
    avgAccuracy: number;
    pctGoodTaste: number;
    pctGoodAccuracy: number;
    branches: BranchWithReview[];
  }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("recipe_branches")
      .select(`
        id,
        ai_model,
        title,
        recipe_id,
        reviews (rating, accuracy_rating, comment, created_at)
      `)
      .then(({ data: branches }) => {
        const grouped: Record<string, any> = {};
        (branches || []).forEach((b: any) => {
          const model = b.ai_model || "Unknown";
          if (!grouped[model]) grouped[model] = { recipes: new Set(), reviews: 0, tasteSum: 0, accSum: 0, goodTaste: 0, goodAcc: 0, branches: [] };
          grouped[model].recipes.add(b.recipe_id);
          (b.reviews || []).forEach((rv: any) => {
            if (!rv.rating && !rv.accuracy_rating) return;
            grouped[model].reviews += 1;
            if (rv.rating) { grouped[model].tasteSum += rv.rating; if (rv.rating >= 4) grouped[model].goodTaste++; }
            if (rv.accuracy_rating) { grouped[model].accSum += rv.accuracy_rating; if (rv.accuracy_rating >= 4) grouped[model].goodAcc++; }
            grouped[model].branches.push({ id: b.id, ai_model: b.ai_model, title: b.title, recipe_id: b.recipe_id, rating: rv.rating, accuracy_rating: rv.accuracy_rating, comment: rv.comment, created_at: rv.created_at });
          });
        });

        const result: Record<string, any> = {};
        Object.entries(grouped).forEach(([model, info]: [string, any]) => {
          result[model] = {
            recipes: info.recipes.size,
            reviews: info.reviews,
            avgTaste: info.reviews > 0 ? (info.tasteSum / info.reviews) : 0,
            avgAccuracy: info.reviews > 0 ? (info.accSum / info.reviews) : 0,
            pctGoodTaste: info.reviews > 0 ? (info.goodTaste / info.reviews * 100) : 0,
            pctGoodAccuracy: info.reviews > 0 ? (info.goodAcc / info.reviews * 100) : 0,
            branches: info.branches,
          };
        });
        setData(result);
        setLoading(false);
      });
  }, []);

  const MODEL_COLORS: Record<string, string> = {
    gemini: "#818cf8",
    chatgpt: "#34d399",
    claude: "#f59e0b",
    deepseek: "#f87171",
    other: "#94a3b8",
  };

  function BarChart({ data }: { data: Record<string, {
    recipes: number;
    reviews: number;
    avgTaste: number;
    avgAccuracy: number;
    pctGoodTaste: number;
    pctGoodAccuracy: number;
    branches: BranchWithReview[];
  }> }) {
    const entries = Object.entries(data).sort((a, b) => b[1].recipes - a[1].recipes);
    const maxRecipes = Math.max(...entries.map(([, s]) => s.recipes));
    return (
      <div style={{ marginBottom: "40px" }}>
        <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.125rem", fontWeight: 600, marginBottom: "20px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
          Recipes per Model
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {entries.map(([model, stats]) => {
            const pct = maxRecipes > 0 ? (stats.recipes / maxRecipes) * 100 : 0;
            const color = MODEL_COLORS[model.toLowerCase()] || MODEL_COLORS.other;
            return (
              <div key={model}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{model}</span>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-faint)" }}>{stats.recipes} recipes</span>
                </div>
                <div style={{ height: "8px", background: "var(--bg-muted)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const totalModels = Object.keys(data).length;
  const totalReviews = Object.values(data).reduce((s, d) => s + d.reviews, 0);

  return (
    <div className="container" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>
          AI Model Benchmark
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "40px" }}>
          How each AI model performs at generating bread recipes — based on real user reviews.
        </p>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: "200px", borderRadius: "12px" }} />)}
          </div>
        ) : totalModels === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-faint)" }}>
            <p>No reviews yet. Be the first to review a recipe!</p>
          </div>
        ) : (
          <>
            {!loading && <BarChart data={data} />}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "48px" }}>
              {Object.entries(data).map(([model, stats]) => (
                <div key={model} className="card" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <span className={`ai-badge ${model.toLowerCase().includes("gemini") ? "gemini" : model.toLowerCase().includes("chatgpt") || model.toLowerCase().includes("gpt") ? "chatgpt" : model.toLowerCase().includes("claude") ? "claude" : model.toLowerCase().includes("deepseek") ? "deepseek" : "other"}`}>
                      {model}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <p style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-playfair), serif" }}>{stats.recipes}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>recipes</p>
                    </div>
                    <div>
                      <p style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-playfair), serif" }}>{stats.reviews}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>reviews</p>
                    </div>
                    <div>
                      <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text)" }}>
                        {stats.avgTaste > 0 ? `★ ${stats.avgTaste.toFixed(1)}` : "—"}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>avg taste</p>
                    </div>
                    <div>
                      <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text)" }}>
                        {stats.avgAccuracy > 0 ? `★ ${stats.avgAccuracy.toFixed(1)}` : "—"}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>avg accuracy</p>
                    </div>
                  </div>
                  {stats.reviews > 0 && (
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
                        {stats.pctGoodTaste.toFixed(0)}% rated taste &ge; ★★★★ &nbsp;&middot;&nbsp; {stats.pctGoodAccuracy.toFixed(0)}% rated accuracy &ge; ★★★★
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.25rem", fontWeight: 600, marginBottom: "20px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
              Review Details
            </h2>

            {Object.entries(data).map(([model, stats]) => (
              <div key={model} style={{ marginBottom: "40px" }}>
                {stats.branches.length > 0 && stats.branches.map((b) => (
                  <div key={b.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>{b.title}</p>
                        {b.created_at && (
                          <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: "2px" }}>
                            {new Date(b.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        {b.accuracy_rating && (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Accuracy: ★{b.accuracy_rating}
                          </span>
                        )}
                        {b.rating && (
                          <span style={{ color: "#F59E0B", letterSpacing: "1px" }}>
                            {"★".repeat(b.rating)}{"☆".repeat(5 - b.rating)}
                          </span>
                        )}
                      </div>
                    </div>
                    {b.comment && (
                      <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6, fontStyle: "italic" }}>
                        &ldquo;{b.comment}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
                {stats.branches.length === 0 && (
                  <p style={{ color: "var(--text-faint)", fontSize: "0.875rem", fontStyle: "italic" }}>No reviews yet</p>
                )}
              </div>
            ))}

            <div style={{ marginTop: "48px", padding: "20px", background: "var(--bg-muted)", borderRadius: "12px", borderLeft: "3px solid var(--accent)" }}>
              <h3 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1rem", fontWeight: 600, marginBottom: "12px", color: "var(--text)" }}>
                Key Observations
              </h3>
              {(() => {
                const sorted = Object.entries(data).sort((a, b) => b[1].reviews - a[1].reviews);
                const topModel = sorted[0][0];
                const topAccuracy = Object.entries(data).filter(([, s]) => s.avgAccuracy > 0).sort((a, b) => b[1].avgAccuracy - a[1].avgAccuracy)[0];
                return (
                  <ul style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
                    <li><strong>{topModel}</strong> has the most recipes in the database ({sorted[0][1].recipes} recipes).</li>
                    {topAccuracy && (
                      <li><strong>{topAccuracy[0]}</strong> scores highest on accuracy (★{topAccuracy[1].avgAccuracy.toFixed(1)} avg).</li>
                    )}
                    <li>Dataset is small — {totalReviews} total reviews across {totalModels} model{totalModels !== 1 ? "s" : ""}. More reviews needed for statistically meaningful conclusions.</li>
                  </ul>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
