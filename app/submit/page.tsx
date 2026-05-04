"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";

const AI_MODELS = ["Gemini", "ChatGPT", "Claude", "DeepSeek", "Other", "Unknown"];
const BREAD_TYPES = ["Sweet", "Savory", "Sourdough", "Other"];

interface ExtractedBranch {
  title: string;
  notes?: string;
  final_recipe?: string;
  sort_order: number;
}

interface ExtractedRecipe {
  title: string;
  ai_model: string;
  bread_type: string;
  description?: string;
  tags?: string[];
  branches: ExtractedBranch[];
}

interface EditableBranch {
  id: string;
  title: string;
  notes: string;
  final_recipe: string;
  sort_order: number;
  photo: File | null;
  photoPreview: string | null;
}

interface EditableRecipe {
  id: string;
  title: string;
  ai_model: string;
  bread_type: string;
  description: string;
  tags: string[];
  branches: EditableBranch[];
  selected: boolean;
}

type Step = "input" | "extracting" | "editing" | "submitting";

export default function SubmitPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ chat_history: "", author_name: "" });
  const [recipes, setRecipes] = useState<EditableRecipe[]>([]);

  async function handleExtract() {
    if (form.chat_history.trim().length < 50) {
      setError(t("submit.chatTooShort"));
      return;
    }
    setStep("extracting");
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_history: form.chat_history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");

      const extracted = data.recipes || [];
      setRecipes(
        extracted.map((r: ExtractedRecipe, i: number) => ({
          id: `recipe-${Date.now()}-${i}`,
          title: r.title,
          ai_model: r.ai_model,
          bread_type: r.bread_type,
          description: r.description || "",
          tags: r.tags || [],
          selected: true,
          branches: r.branches.map((b: ExtractedBranch, j: number) => ({
            id: `branch-${Date.now()}-${i}-${j}`,
            title: b.title,
            notes: b.notes || "",
            final_recipe: b.final_recipe || "",
            sort_order: b.sort_order,
            photo: null,
            photoPreview: null,
          })),
        }))
      );
      setStep("editing");
    } catch (err: any) {
      setError(err.message);
      setStep("input");
    }
  }

  function toggleSelect(id: string) {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  }

  function updateRecipeField<K extends keyof EditableRecipe>(id: string, key: K, value: EditableRecipe[K]) {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  function updateBranchField(recipeId: string, branchId: string, key: keyof EditableBranch, value: any) {
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              branches: r.branches.map((b) => (b.id === branchId ? { ...b, [key]: value } : b)),
            }
          : r
      )
    );
  }

  function handlePhotoChange(recipeId: string, branchId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    updateBranchField(recipeId, branchId, "photoPreview", preview);
    updateBranchField(recipeId, branchId, "photo", file);
  }

  async function handlePublish() {
    const selected = recipes.filter((r) => r.selected);
    if (selected.length === 0) {
      setError(t("submit.selectOne"));
      return;
    }
    setStep("submitting");
    try {
      for (const recipe of selected) {
        const { data: recipeData, error: recipeErr } = await supabase
          .from("recipes")
          .insert({
            title: recipe.title,
            ai_model: recipe.ai_model,
            bread_type: recipe.bread_type,
            description: recipe.description || null,
            chat_history: form.chat_history,
            author_name: form.author_name || "Anonymous",
          })
          .select()
          .single();

        if (recipeErr || !recipeData) {
          throw new Error("Failed to insert recipe");
        }

        for (const branch of recipe.branches) {
          let photo_url: string | null = null;
          if (branch.photo) {
            const ext = branch.photo.name.split(".").pop();
            const fileName = `${Date.now()}-${Math.random()}.${ext}`;
            await supabase.storage.from("outcome-photos").upload(fileName, branch.photo);
            const { data: urlData } = supabase.storage.from("outcome-photos").getPublicUrl(fileName);
            photo_url = urlData.publicUrl;
          }
          await supabase.from("recipe_branches").insert({
            recipe_id: recipeData.id,
            title: branch.title,
            ai_model: recipe.ai_model,
            bread_type: recipe.bread_type,
            notes: branch.notes || null,
            final_recipe: branch.final_recipe || null,
            outcome_photo_url: photo_url,
            tags: recipe.tags,
            sort_order: branch.sort_order,
          });
        }
      }
      router.push("/");
    } catch {
      setError(t("submit.failed"));
      setStep("editing");
    }
  }

  const selectedCount = recipes.filter((r) => r.selected).length;
  const totalBranches = recipes.reduce((sum, r) => sum + r.branches.length, 0);
  const recipeWord = selectedCount === 1 ? t("submit.found_one") : t("submit.found_other");
  const branchWord = totalBranches === 1 ? t("submit.branches_one") : t("submit.branches_other");

  /* ── Input ── */
  if (step === "input") {
    return (
      <div className="container" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ marginBottom: "40px" }}>
            <p className="section-label" style={{ marginBottom: "10px" }}>{t("submit.label")}</p>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "12px" }}>
              {t("submit.title")}
            </h1>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
              {t("submit.description")}
            </p>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", color: "#dc2626", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          <div className="card" style={{ padding: "28px", marginBottom: "20px" }}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>{t("submit.yourName")}</label>
              <input type="text" className="input" value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} placeholder={t("submit.namePlaceholder")} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>{t("submit.conversation")}</label>
              <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginBottom: "10px" }}>{t("submit.conversationHint")}</p>
              <textarea
                required
                className="input"
                rows={18}
                style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "0.8rem" }}
                value={form.chat_history}
                onChange={(e) => setForm({ ...form, chat_history: e.target.value })}
                placeholder={t("submit.chatPlaceholder")}
              />
            </div>
          </div>

          <button
            onClick={handleExtract}
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1rem", borderRadius: "8px" }}
          >
            {t("submit.extractBtn")}
          </button>
        </div>
      </div>
    );
  }

  /* ── Extracting ── */
  if (step === "extracting") {
    return (
      <div className="container" style={{ paddingTop: "80px", paddingBottom: "80px", textAlign: "center" }}>
        <div style={{ maxWidth: "420px", margin: "0 auto" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
          <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.5rem", fontWeight: 600, marginBottom: "8px" }}>
            {t("submit.extracting")}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>{t("submit.extractingHint")}</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Editing ── */
  if (step === "editing") {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ marginBottom: "28px" }}>
            <p className="section-label" style={{ marginBottom: "8px" }}>
              {recipes.length} {recipeWord}, {totalBranches} {branchWord} {t("submit.found_other")}
            </p>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "8px" }}>
              {t("submit.reviewTitle")}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {t("submit.reviewHint")}
            </p>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", color: "#dc2626", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "32px" }}>
            {recipes.map((recipe, rIdx) => (
              <div
                key={recipe.id}
                className="card"
                style={{
                  padding: "24px",
                  opacity: recipe.selected ? 1 : 0.5,
                  transition: "opacity 0.15s",
                  border: recipe.selected ? "2px solid var(--accent)" : "2px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={recipe.selected}
                    onChange={() => toggleSelect(recipe.id)}
                    style={{ width: "20px", height: "20px", marginTop: "4px", cursor: "pointer", accentColor: "var(--accent)" }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: recipe.selected ? "var(--accent)" : "var(--bg-muted)", color: recipe.selected ? "white" : "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>
                          {rIdx + 1}
                        </span>
                        {recipe.selected && (
                          <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 600 }}>
                            {recipe.branches.length} {recipe.branches.length === 1 ? t("submit.branches_one") : t("submit.branches_other")}
                          </span>
                        )}
                      </div>
                    </div>

                    {recipe.selected && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{t("submit.recipeTitle")}</label>
                            <input type="text" className="input" value={recipe.title} onChange={(e) => updateRecipeField(recipe.id, "title", e.target.value)} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{t("submit.model")}</label>
                            <select className="input" value={recipe.ai_model} onChange={(e) => updateRecipeField(recipe.id, "ai_model", e.target.value)}>
                              {AI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{t("submit.type")}</label>
                            <select className="input" value={recipe.bread_type} onChange={(e) => updateRecipeField(recipe.id, "bread_type", e.target.value)}>
                              {BREAD_TYPES.map((t_) => <option key={t_} value={t_}>{t_}</option>)}
                            </select>
                          </div>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                          <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{t("submit.description")}</label>
                          <input
                            type="text"
                            className="input"
                            value={recipe.description}
                            onChange={(e) => updateRecipeField(recipe.id, "description", e.target.value)}
                            placeholder={t("submit.descriptionPlaceholder")}
                          />
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                          <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Tags</label>
                          <input
                            type="text"
                            className="input"
                            value={recipe.tags.join(", ")}
                            onChange={(e) => updateRecipeField(recipe.id, "tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                            placeholder="banana, sweet, soft-crumb"
                          />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            {t("submit.branchesTitle")}
                          </p>
                          {recipe.branches.map((branch, bIdx) => (
                            <div key={branch.id} style={{ background: "var(--bg-muted)", borderRadius: "8px", padding: "16px" }}>
                              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", fontWeight: 600, marginTop: "8px", width: "20px", textAlign: "center" }}>
                                  #{bIdx + 1}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ marginBottom: "10px" }}>
                                    <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>{t("submit.branchTitle")}</label>
                                    <input
                                      type="text"
                                      className="input"
                                      value={branch.title}
                                      onChange={(e) => updateBranchField(recipe.id, branch.id, "title", e.target.value)}
                                      style={{ fontSize: "0.875rem" }}
                                    />
                                  </div>

                                  <div style={{ marginBottom: "10px" }}>
                                    <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>{t("submit.branchNotes")}</label>
                                    <input
                                      type="text"
                                      className="input"
                                      value={branch.notes}
                                      onChange={(e) => updateBranchField(recipe.id, branch.id, "notes", e.target.value)}
                                      placeholder={t("submit.branchNotesPlaceholder")}
                                      style={{ fontSize: "0.875rem" }}
                                    />
                                  </div>

                                  <div style={{ marginBottom: "12px" }}>
                                    <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>{t("submit.branchRecipe")}</label>
                                    <textarea
                                      className="input"
                                      rows={4}
                                      style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "0.8rem" }}
                                      value={branch.final_recipe}
                                      onChange={(e) => updateBranchField(recipe.id, branch.id, "final_recipe", e.target.value)}
                                    />
                                  </div>

                                  <div>
                                    <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{t("submit.branchPhoto")}</label>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handlePhotoChange(recipe.id, branch.id, e)}
                                      id={`photo-${branch.id}`}
                                      style={{ display: "none" }}
                                    />
                                    <label htmlFor={`photo-${branch.id}`} style={{ display: "block", cursor: "pointer" }}>
                                      {branch.photoPreview ? (
                                        <div style={{ borderRadius: "8px", overflow: "hidden", position: "relative" }}>
                                          <img src={branch.photoPreview} alt="Preview" style={{ width: "100%", maxHeight: "160px", objectFit: "cover" }} />
                                          <div style={{ position: "absolute", bottom: "6px", right: "6px", background: "rgba(0,0,0,0.55)", color: "white", fontSize: "0.65rem", padding: "2px 7px", borderRadius: "4px" }}>Change</div>
                                        </div>
                                      ) : (
                                        <div className="upload-zone" style={{ padding: "10px" }}>
                                          <p style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>{t("submit.addPhoto")}</p>
                                        </div>
                                      )}
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => setStep("input")} className="btn-ghost" style={{ flex: 1, justifyContent: "center", padding: "14px" }}>
              {t("submit.startOver")}
            </button>
            <button
              onClick={handlePublish}
              className="btn-primary"
              style={{ flex: 3, justifyContent: "center", padding: "14px", fontSize: "1rem" }}
            >
              {selectedCount === 0
                ? t("submit.selectAtLeast")
                : t("submit.publish_" + (selectedCount === 1 ? "one" : "other"), { count: selectedCount })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Submitting ── */
  if (step === "submitting") {
    return (
      <div className="container" style={{ paddingTop: "80px", paddingBottom: "80px", textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
        <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.5rem", fontWeight: 600 }}>{t("submit.publishing")}</h2>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return null;
}