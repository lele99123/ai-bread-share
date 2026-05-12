"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";
import Link from "next/link";

interface ModelStats {
  model: string;
  avg_accuracy: number | null;
  avg_taste: number | null;
  total_reviews: number;
  total_recipes: number;
}

const MODEL_META: Record<string, { color: string; bg: string; icon: string }> = {
  Gemini:   { color: "#4285F4", bg: "#EEF3FF", icon: "G" },
  ChatGPT:  { color: "#10A37F", bg: "#EDFAF5", icon: "C" },
  Claude:   { color: "#B45309", bg: "#FEF3E2", icon: "C" },
  DeepSeek: { color: "#646769", bg: "#F3F3F3", icon: "D" },
  Other:    { color: "#78716C", bg: "#F5F5F4", icon: "?" },
  Unknown:  { color: "#78716C", bg: "#F5F5F4", icon: "?" },
};

function getModelMeta(model: string) {
  const m = model.toLowerCase();
  if (m.includes("gemini"))    return MODEL_META.Gemini;
  if (m.includes("chatgpt") || m.includes("gpt")) return MODEL_META.ChatGPT;
  if (m.includes("claude"))    return MODEL_META.Claude;
  if (m.includes("deepseek")) return MODEL_META.DeepSeek;
  if (model && model !== "Unknown") return MODEL_META.Other;
  return MODEL_META.Unknown;
}

function StarBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{
        flex: 1, height: "6px", background: "#E5E7EB",
        borderRadius: "3px", overflow: "hidden", maxWidth: "120px"
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: "linear-gradient(90deg, #F59E0B, #FBBF24)",
          borderRadius: "3px",
        }} />
      </div>
      <span style={{ fontSize: "0.8rem", color: "#6B7280", fontWeight: 500, minWidth: "28px" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function ModelCard({ stats }: { stats: ModelStats }) {
  const meta = getModelMeta(stats.model);
  const hasData = stats.total_reviews > 0;

  return (
    <div style={{
      background: "white",
      borderRadius: "16px",
      padding: "24px",
      border: "1px solid var(--border, #E5E7EB)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div style={{
          width: "44px", height: "44px", borderRadius: "10px",
          background: meta.bg, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "1.1rem", fontWeight: 700,
          color: meta.color, flexShrink: 0,
        }}>
          {meta.icon}
        </div>
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#1F2937", margin: 0 }}>
            {stats.model}
          </h3>
          <p style={{ fontSize: "0.75rem", color: "#9CA3AF", margin: "2px 0 0" }}>
            {stats.total_recipes} recipes · {stats.total_reviews} reviews
          </p>
        </div>
      </div>

      {!hasData ? (
        <p style={{ fontSize: "0.85rem", color: "#9CA3AF", fontStyle: "italic" }}>
          No reviews yet — be the first to benchmark this model
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.8rem", color: "#6B7280" }}>Accuracy</span>
              <span style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>
                Recipe correctness & clarity
              </span>
            </div>
            <StarBar value={stats.avg_accuracy ?? 0} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.8rem", color: "#6B7280" }}>Taste</span>
              <span style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>
                Actual bread quality
              </span>
            </div>
            <StarBar value={stats.avg_taste ?? 0} />
          </div>
        </div>
      )}

      {hasData && (
        <div style={{
          marginTop: "20px", paddingTop: "16px",
          borderTop: "1px solid #F3F4F6",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <span style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>Overall</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#F59E0B" }}>
              {(((stats.avg_accuracy ?? 0) + (stats.avg_taste ?? 0)) / 2).toFixed(1)}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>/ 5</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BenchmarkPage() {
  const { t, locale } = useLanguage();
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: branches } = await supabase
        .from("recipe_branches")
        .select("id, ai_model, recipe_id");

      const { data: reviews } = await supabase
        .from("reviews")
        .select("branch_id, rating, accuracy_rating");

      if (!branches || !reviews) { setLoading(false); return; }

      const branchModelMap = new Map<string, string>();
      branches.forEach(b => branchModelMap.set(b.id, b.ai_model || "Unknown"));

      const modelData = new Map<string, { accuracy: number[]; taste: number[]; recipes: Set<string> }>();

      reviews.forEach(r => {
        const model = branchModelMap.get(r.branch_id) || "Unknown";
        if (!modelData.has(model)) {
          modelData.set(model, { accuracy: [], taste: [], recipes: new Set() });
        }
        const d = modelData.get(model)!;
        if (r.accuracy_rating) d.accuracy.push(r.accuracy_rating);
        if (r.rating) d.taste.push(r.rating);
      });

      const recipeModelMap = new Map<string, Set<string>>();
      branches.forEach(b => {
        if (!recipeModelMap.has(b.ai_model)) recipeModelMap.set(b.ai_model, new Set());
        recipeModelMap.get(b.ai_model)!.add(b.recipe_id);
      });

      const stats: ModelStats[] = [];
      modelData.forEach((d, model) => {
        stats.push({
          model,
          avg_accuracy: d.accuracy.length ? d.accuracy.reduce((a, b) => a + b, 0) / d.accuracy.length : null,
          avg_taste: d.taste.length ? d.taste.reduce((a, b) => a + b, 0) / d.taste.length : null,
          total_reviews: d.accuracy.length + d.taste.length,
          total_recipes: recipeModelMap.get(model)?.size ?? 0,
        });
      });

      stats.sort((a, b) => b.total_reviews - a.total_reviews);
      setModelStats(stats);
      setLoading(false);
    }
    load();
  }, []);

  const totalRecipes = modelStats.reduce((sum, m) => sum + m.total_recipes, 0);
  const totalReviews = modelStats.reduce((sum, m) => sum + m.total_reviews, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #FAFAF9)" }}>
      <header style={{
        borderBottom: "1px solid var(--border, #E5E7EB)",
        background: "white", padding: "32px 0 24px",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>
          <Link href="/" style={{ fontSize: "0.85rem", color: "#9CA3AF", textDecoration: "none" }}>
            ← {t("recipe.back")}
          </Link>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1F2937", margin: "8px 0 6px" }}>
            {locale === "zh" ? "AI 模型评测" : "AI Model Benchmark"}
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#6B7280", margin: 0 }}>
            {locale === "zh"
              ? `基于 ${totalReviews} 条真实评价，衡量各模型在配方准确度和味道上的表现`
              : `${totalReviews} real reviews measuring recipe accuracy and taste across models`}
          </p>
        </div>
      </header>

      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF" }}>
            {locale === "zh" ? "加载中..." : "Loading..."}
          </div>
        ) : (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
              marginBottom: "40px",
            }}>
              {modelStats.map(stats => (
                <ModelCard key={stats.model} stats={stats} />
              ))}
            </div>

            <div style={{
              background: "white",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid var(--border, #E5E7EB)",
            }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: "12px" }}>
                {locale === "zh" ? "评分说明" : "Rating Methodology"}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "12px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6B7280", minWidth: "70px" }}>Accuracy</span>
                  <span style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>
                    {locale === "zh"
                      ? "配方是否清晰准确？步骤是否完整、可操作？"
                      : "Were the recipe steps clear, accurate, and actionable?"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6B7280", minWidth: "70px" }}>Taste</span>
                  <span style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>
                    {locale === "zh"
                      ? "面包实际做出来好吃吗？符合预期吗？"
                      : "Did the bread actually taste good and match expectations?"}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #F3F4F6" }}>
                <p style={{ fontSize: "0.8rem", color: "#9CA3AF", margin: 0 }}>
                  {locale === "zh"
                    ? `基于 ${totalRecipes} 个食谱，共 ${totalReviews} 条评价`
                    : `Based on ${totalRecipes} recipes with ${totalReviews} community reviews`}
                </p>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "32px" }}>
              <Link href="/" style={{
                display: "inline-block",
                background: "#F59E0B", color: "white",
                padding: "12px 24px", borderRadius: "8px",
                fontWeight: 600, fontSize: "0.9rem",
                textDecoration: "none",
              }}>
                {locale === "zh" ? "查看食谱 →" : "Browse Recipes →"}
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
