"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const AI_MODELS = ["Gemini", "ChatGPT", "Claude", "DeepSeek", "Other", "Unknown"];
const BREAD_TYPES = ["Sweet", "Savory", "Sourdough", "Other"];

interface ExtractedRecipe {
  title: string;
  ai_model: string;
  bread_type: string;
  final_recipe: string;
  notes?: string;
  description?: string;
}

interface PublishableRecipe extends ExtractedRecipe {
  id: string; // temp react key
  selected: boolean;
  photo: File | null;
  photoPreview: string | null;
}

type Step = "input" | "extracting" | "editing" | "submitting";

export default function SubmitPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ chat_history: "", author_name: "" });
  const [recipes, setRecipes] = useState<PublishableRecipe[]>([]);

  async function handleExtract() {
    if (form.chat_history.trim().length < 50) {
      setError("Chat history is too short.");
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

      setRecipes(
        (data.recipes || data.branches || []).map((r: ExtractedRecipe, i: number) => ({
          ...r,
          id: `recipe-${Date.now()}-${i}`,
          selected: true,
          photo: null,
          photoPreview: null,
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

  function updateField<K extends keyof PublishableRecipe>(id: string, key: K, value: PublishableRecipe[K]) {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  function handlePhotoChange(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    updateField(id, "photoPreview", preview);
    updateField(id, "photo", file);
  }

  async function handlePublish() {
    const selected = recipes.filter((r) => r.selected);
    if (selected.length === 0) {
      setError("Please select at least one recipe to publish.");
      return;
    }
    setStep("submitting");
    try {
      for (const recipe of selected) {
        let photo_url: string | null = null;
        if (recipe.photo) {
          const ext = recipe.photo.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random()}.${ext}`;
          await supabase.storage.from("outcome-photos").upload(fileName, recipe.photo);
          const { data } = supabase.storage.from("outcome-photos").getPublicUrl(fileName);
          photo_url = data.publicUrl;
        }
        await supabase.from("recipes").insert({
          title: recipe.title,
          ai_model: recipe.ai_model,
          bread_type: recipe.bread_type,
          final_recipe: recipe.final_recipe || null,
          notes: recipe.notes || null,
          description: recipe.description || null,
          outcome_photo_url: photo_url,
          chat_history: form.chat_history,
          author_name: form.author_name || "Anonymous",
        });
      }
      router.push("/");
    } catch {
      setError("Failed to publish. Please try again.");
      setStep("editing");
    }
  }

  const selectedCount = recipes.filter((r) => r.selected).length;

  /* ── Input ── */
  if (step === "input") {
    return (
      <div className="container" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ marginBottom: "40px" }}>
            <p className="section-label" style={{ marginBottom: "10px" }}>Share with the community</p>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "12px" }}>
              Submit Recipes
            </h1>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
              Paste your AI conversation. We&apos;ll find every distinct recipe discussed — each becomes its own post.
            </p>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", color: "#dc2626", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          <div className="card" style={{ padding: "28px", marginBottom: "20px" }}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>Your Name</label>
              <input type="text" className="input" value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} placeholder="Anonymous" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>AI Conversation *</label>
              <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginBottom: "10px" }}>Paste the full chat. We&apos;ll extract every distinct recipe discussed.</p>
              <textarea
                required
                className="input"
                rows={18}
                style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "0.8rem" }}
                value={form.chat_history}
                onChange={(e) => setForm({ ...form, chat_history: e.target.value })}
                placeholder={`# you asked\n\n帮我整理一个更好的面包配方...\n\n---\n\n# gemini response\n\n帮你把这两款吐司的配方都做了升级...\n\n---\n\n# you asked\n\n如果我想加入香蕉呢？...\n\n# gemini response\n\n加入香蕉意味着配方需要进行大手术...`}
              />
            </div>
          </div>

          <button
            onClick={handleExtract}
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1rem", borderRadius: "8px" }}
          >
            Find All Recipes
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
            Finding all recipes...
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>Scanning the conversation for distinct breads.</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Editing ── */
  if (step === "editing") {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div style={{ marginBottom: "28px" }}>
            <p className="section-label" style={{ marginBottom: "8px" }}>
              {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} found — select which to publish
            </p>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "8px" }}>
              Review & Select
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Uncheck any recipes you don&apos;t want to publish. Edit details before posting.
            </p>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", color: "#dc2626", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "32px" }}>
            {recipes.map((recipe, idx) => (
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
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={recipe.selected}
                    onChange={() => toggleSelect(recipe.id)}
                    style={{ width: "20px", height: "20px", marginTop: "4px", cursor: "pointer", accentColor: "var(--accent)" }}
                  />

                  <div style={{ flex: 1 }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: recipe.selected ? "var(--accent)" : "var(--bg-muted)", color: recipe.selected ? "white" : "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                          {idx + 1}
                        </span>
                        {recipe.selected && (
                          <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 600 }}>Will be published</span>
                        )}
                      </div>
                    </div>

                    {recipe.selected && (
                      <>
                        {/* Fields */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Title</label>
                            <input type="text" className="input" value={recipe.title} onChange={(e) => updateField(recipe.id, "title", e.target.value)} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>AI Model</label>
                            <select className="input" value={recipe.ai_model} onChange={(e) => updateField(recipe.id, "ai_model", e.target.value)}>
                              {AI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Type</label>
                            <select className="input" value={recipe.bread_type} onChange={(e) => updateField(recipe.id, "bread_type", e.target.value)}>
                              {BREAD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Notes + Description */}
                        <div style={{ marginBottom: "12px" }}>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Notes</label>
                          <input
                            type="text"
                            className="input"
                            value={recipe.notes || ""}
                            onChange={(e) => updateField(recipe.id, "notes", e.target.value)}
                            placeholder="Problems, questions, or observations while making this bread"
                          />
                        </div>

                        {/* Recipe text */}
                        <div style={{ marginBottom: "14px" }}>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Recipe</label>
                          <textarea
                            className="input"
                            rows={6}
                            style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "0.8rem" }}
                            value={recipe.final_recipe}
                            onChange={(e) => updateField(recipe.id, "final_recipe", e.target.value)}
                          />
                        </div>

                        {/* Description */}
                        <div style={{ marginBottom: "14px" }}>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Description</label>
                          <input
                            type="text"
                            className="input"
                            value={recipe.description || ""}
                            onChange={(e) => updateField(recipe.id, "description", e.target.value)}
                            placeholder="Brief description of this bread — flavor, texture, what makes it special"
                          />
                        </div>

                        {/* Photo */}
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Photo</label>
                          <input type="file" accept="image/*" onChange={(e) => handlePhotoChange(recipe.id, e)} className="input" id={`photo-${recipe.id}`} style={{ display: "none" }} />
                          <label htmlFor={`photo-${recipe.id}`} style={{ display: "block", cursor: "pointer" }}>
                            {recipe.photoPreview ? (
                              <div style={{ borderRadius: "8px", overflow: "hidden", position: "relative" }}>
                                <img src={recipe.photoPreview} alt="Preview" style={{ width: "100%", maxHeight: "200px", objectFit: "cover" }} />
                                <div style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(0,0,0,0.55)", color: "white", fontSize: "0.7rem", padding: "3px 8px", borderRadius: "4px" }}>Change</div>
                              </div>
                            ) : (
                              <div className="upload-zone" style={{ padding: "14px" }}>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>+ Add photo (optional)</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => setStep("input")} className="btn-ghost" style={{ flex: 1, justifyContent: "center", padding: "14px" }}>
              ← Start Over
            </button>
            <button
              onClick={handlePublish}
              className="btn-primary"
              style={{ flex: 3, justifyContent: "center", padding: "14px", fontSize: "1rem" }}
            >
              {selectedCount === 0
                ? "Select at least one recipe"
                : `Publish ${selectedCount} Recipe${selectedCount !== 1 ? "s" : ""}`}
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
        <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.5rem", fontWeight: 600 }}>Publishing...</h2>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return null;
}
