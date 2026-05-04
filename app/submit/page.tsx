"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const AI_MODELS = ["Gemini", "ChatGPT", "Claude", "DeepSeek", "Other", "Unknown"];
const BREAD_TYPES = ["Sweet", "Savory", "Sourdough", "Other"];

interface ExtractedBranch {
  title: string;
  ai_model: string;
  bread_type: string;
  final_recipe: string;
  notes?: string;
}

type SubmitState =
  | { step: "input" }
  | { step: "extracting" }
  | {
      step: "editing";
      branches: EditableBranch[];
      chat_history: string;
      author_name: string;
    }
  | { step: "submitting" }
  | { step: "error"; message: string };

interface EditableBranch {
  id: string; // temp id for react keys
  title: string;
  ai_model: string;
  bread_type: string;
  final_recipe: string;
  notes: string;
  photo: File | null;
  photoPreview: string | null;
}

export default function SubmitPage() {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>({ step: "input" });
  const [form, setForm] = useState({ chat_history: "", author_name: "" });

  async function handleExtract() {
    if (form.chat_history.trim().length < 50) {
      setState({ step: "error", message: "Chat history is too short. Please paste more of the conversation." });
      return;
    }
    setState({ step: "extracting" });
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_history: form.chat_history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");

      const branches: EditableBranch[] = (data.branches || []).map(
        (b: ExtractedBranch, i: number) => ({
          id: `branch-${Date.now()}-${i}`,
          title: b.title || `Recipe ${i + 1}`,
          ai_model: b.ai_model || "Unknown",
          bread_type: b.bread_type || "Sweet",
          final_recipe: b.final_recipe || "",
          notes: b.notes || "",
          photo: null,
          photoPreview: null,
        })
      );

      if (branches.length === 0) {
        throw new Error("No recipes found in this conversation.");
      }

      setState({
        step: "editing",
        branches,
        chat_history: form.chat_history,
        author_name: form.author_name,
      });
    } catch (err: any) {
      setState({ step: "error", message: err.message });
    }
  }

  function updateBranch(id: string, patch: Partial<EditableBranch>) {
    const s = state;
    if (s.step !== "editing") return;
    setState({
      ...s,
      branches: s.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  }

  function removeBranch(id: string) {
    const s = state;
    if (s.step !== "editing") return;
    if (s.branches.length <= 1) return; // keep at least one
    setState({ ...s, branches: s.branches.filter((b) => b.id !== id) });
  }

  function addBranch() {
    const s = state;
    if (s.step !== "editing") return;
    setState({
      ...s,
      branches: [
        ...s.branches,
        {
          id: `branch-${Date.now()}`,
          title: "",
          ai_model: "Unknown",
          bread_type: "Sweet",
          final_recipe: "",
          notes: "",
          photo: null,
          photoPreview: null,
        },
      ],
    });
  }

  function handlePhotoChange(branchId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    updateBranch(branchId, { photo: file, photoPreview: preview });
  }

  async function handlePublish() {
    const s = state;
    if (s.step !== "editing") return;
    setState({ step: "submitting" });

    try {
      // 1. Create conversation
      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          title: `Conversation — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
          chat_history: s.chat_history,
          author_name: s.author_name || "Anonymous",
        })
        .select()
        .single();

      if (recipeError || !recipe) throw new Error("Failed to save conversation");

      // 2. Upload photos and create branches
      const branchInserts = await Promise.all(
        s.branches.map(async (branch, i) => {
          let photo_url: string | null = null;
          if (branch.photo) {
            const ext = branch.photo.name.split(".").pop();
            const fileName = `${Date.now()}-${i}.${ext}`;
            await supabase.storage.from("outcome-photos").upload(fileName, branch.photo);
            const { data } = supabase.storage.from("outcome-photos").getPublicUrl(fileName);
            photo_url = data.publicUrl;
          }
          return {
            recipe_id: recipe.id,
            title: branch.title || `Recipe ${i + 1}`,
            ai_model: branch.ai_model,
            bread_type: branch.bread_type,
            final_recipe: branch.final_recipe || null,
            outcome_photo_url: photo_url,
            sort_order: i,
          };
        })
      );

      const { error: branchError } = await supabase
        .from("recipe_branches")
        .insert(branchInserts);

      if (branchError) throw new Error("Failed to save branches");
      router.push(`/recipes/${recipe.id}`);
    } catch (err: any) {
      setState({ step: "error", message: err.message });
    }
  }

  /* ── Step 1: Input ── */
  if (state.step === "input" || state.step === "error") {
    return (
      <div className="container" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ marginBottom: "40px" }}>
            <p className="section-label" style={{ marginBottom: "10px" }}>Share with the community</p>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "12px" }}>
              Submit a Recipe
            </h1>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
              Paste your AI conversation. We'll automatically find every distinct recipe discussed — there may be several.
            </p>
          </div>

          {state.step === "error" && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", color: "#dc2626", fontSize: "0.875rem" }}>
              {state.message}
            </div>
          )}

          <div className="card" style={{ padding: "28px", marginBottom: "20px" }}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>Your Name</label>
              <input
                type="text"
                className="input"
                value={form.author_name}
                onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                placeholder="Anonymous"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>
                AI Conversation *
              </label>
              <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginBottom: "10px" }}>
                Paste the full chat — all prompts and responses. Include everything, even the troubleshooting parts.
              </p>
              <textarea
                required
                className="input"
                rows={18}
                style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "0.8rem" }}
                value={form.chat_history}
                onChange={(e) => setForm({ ...form, chat_history: e.target.value })}
                placeholder={`# you asked\n\n帮我整理一个更好的面包配方...\n\n---\n\n# gemini response\n\n帮你把这两款吐司的配方都做了升级...\n\n---\n\n# you asked\n\n如果我想加入香蕉呢？...\n\n---\n\n# gemini response\n\n加入香蕉意味着配方需要进行大手术...`}
              />
            </div>
          </div>

          <button
            onClick={handleExtract}
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1rem", borderRadius: "8px" }}
          >
            Extract All Recipes
          </button>
        </div>
      </div>
    );
  }

  /* ── Step 2: Extracting ── */
  if (state.step === "extracting") {
    return (
      <div className="container" style={{ paddingTop: "80px", paddingBottom: "80px", textAlign: "center" }}>
        <div style={{ maxWidth: "420px", margin: "0 auto" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%",
            border: "3px solid var(--border)", borderTopColor: "var(--accent)",
            animation: "spin 0.8s linear infinite", margin: "0 auto 20px",
          }} />
          <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.5rem", fontWeight: 600, marginBottom: "8px" }}>
            Finding all recipes...
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            Scanning the conversation for distinct recipes. This may take a moment.
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Step 3: Editing branches ── */
  if (state.step === "editing") {
    const s = state;
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: "28px" }}>
            <p className="section-label" style={{ marginBottom: "8px" }}>
              {s.branches.length} recipe{s.branches.length !== 1 ? "s" : ""} found
            </p>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "8px" }}>
              Review & Edit
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Every distinct recipe from your conversation is shown below. Edit any field, then publish.
            </p>
          </div>

          {/* Branch cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "32px" }}>
            {s.branches.map((branch, idx) => (
              <div key={branch.id} className="card" style={{ padding: "24px" }}>
                {/* Branch header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: idx === 0 ? "var(--accent)" : "var(--bg-muted)",
                      color: idx === 0 ? "white" : "var(--text-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-faint)", fontWeight: 500 }}>
                      {idx === 0 ? "Primary recipe" : ""}
                    </span>
                  </div>
                  {s.branches.length > 1 && (
                    <button
                      onClick={() => removeBranch(branch.id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-faint)", padding: "4px",
                        fontSize: "1.2rem", lineHeight: 1, borderRadius: "4px",
                        transition: "color 0.15s",
                      }}
                      title="Remove this recipe"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  {/* Title */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Recipe Title</label>
                    <input
                      type="text"
                      className="input"
                      value={branch.title}
                      onChange={(e) => updateBranch(branch.id, { title: e.target.value })}
                      placeholder="e.g. Milk Toast (Original)"
                    />
                  </div>

                  {/* AI Model */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>AI Model</label>
                    <select
                      className="input"
                      value={branch.ai_model}
                      onChange={(e) => updateBranch(branch.id, { ai_model: e.target.value })}
                    >
                      {AI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Bread Type */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Type</label>
                    <select
                      className="input"
                      value={branch.bread_type}
                      onChange={(e) => updateBranch(branch.id, { bread_type: e.target.value })}
                    >
                      {BREAD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                {branch.notes && (
                  <div style={{ marginBottom: "14px", padding: "10px 14px", background: "var(--bg-muted)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                    {branch.notes}
                  </div>
                )}

                {/* Recipe */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Final Recipe</label>
                  <textarea
                    className="input"
                    rows={8}
                    style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "0.8rem" }}
                    value={branch.final_recipe}
                    onChange={(e) => updateBranch(branch.id, { final_recipe: e.target.value })}
                    placeholder="### Ingredients\n...\n\n### Steps\n..."
                  />
                </div>

                {/* Photo */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                    Outcome Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoChange(branch.id, e)}
                    className="input"
                    id={`photo-${branch.id}`}
                    style={{ display: "none" }}
                  />
                  <label htmlFor={`photo-${branch.id}`} style={{ display: "block", cursor: "pointer" }}>
                    {branch.photoPreview ? (
                      <div style={{ borderRadius: "8px", overflow: "hidden", position: "relative" }}>
                        <img src={branch.photoPreview} alt="Preview" style={{ width: "100%", maxHeight: "220px", objectFit: "cover", display: "block" }} />
                        <div style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(0,0,0,0.55)", color: "white", fontSize: "0.7rem", padding: "3px 8px", borderRadius: "4px" }}>
                          Change
                        </div>
                      </div>
                    ) : (
                      <div className="upload-zone" style={{ padding: "16px" }}>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>+ Add photo (optional)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Add branch */}
          <button
            onClick={addBranch}
            className="btn-ghost"
            style={{ width: "100%", justifyContent: "center", marginBottom: "24px", gap: "8px" }}
          >
            <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>+</span>
            Add another recipe
          </button>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setState({ step: "input" })}
              className="btn-ghost"
              style={{ flex: 1, justifyContent: "center", padding: "14px" }}
            >
              ← Start Over
            </button>
            <button
              onClick={handlePublish}
              className="btn-primary"
              style={{ flex: 3, justifyContent: "center", padding: "14px", fontSize: "1rem" }}
            >
              Publish {s.branches.length} Recipe{s.branches.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 4: Submitting ── */
  if (state.step === "submitting") {
    return (
      <div className="container" style={{ paddingTop: "80px", paddingBottom: "80px", textAlign: "center" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%",
          border: "3px solid var(--border)", borderTopColor: "var(--accent)",
          animation: "spin 0.8s linear infinite", margin: "0 auto 20px",
        }} />
        <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.5rem", fontWeight: 600 }}>
          Publishing...
        </h2>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return null;
}
