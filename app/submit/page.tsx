"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ExtractionState =
  | { step: "idle" }
  | { step: "extracting" }
  | {
      step: "preview";
      title: string;
      ai_model: string;
      bread_type: string;
      final_recipe: string;
      chat_history: string;
      author_name: string;
      photo: File | null;
      photoPreview: string | null;
    }
  | { step: "submitting" }
  | { step: "error"; message: string };

export default function SubmitPage() {
  const router = useRouter();
  const [state, setState] = useState<ExtractionState>({ step: "idle" });
  const [form, setForm] = useState({ chat_history: "", author_name: "" });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setState((prev) =>
      prev.step === "preview"
        ? { ...prev, photo: file, photoPreview: preview }
        : { step: "preview", title: "", ai_model: "", bread_type: "Sweet", final_recipe: "", chat_history: form.chat_history, author_name: form.author_name, photo: file, photoPreview: preview }
    );
  }

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

      setState({
        step: "preview",
        title: data.title || "Untitled Recipe",
        ai_model: data.ai_model || "Unknown",
        bread_type: data.bread_type || "Sweet",
        final_recipe: data.final_recipe || "",
        chat_history: form.chat_history,
        author_name: form.author_name,
        photo: null,
        photoPreview: null,
      });
    } catch (err: any) {
      setState({ step: "error", message: err.message });
    }
  }

  async function handleFinalSubmit() {
    if (state.step !== "preview") return;
    const s = state;
    setState({ step: "submitting" });

    try {
      let photo_url: string | null = null;
      if (s.photo) {
        const ext = s.photo.name.split(".").pop();
        const fileName = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("outcome-photos")
          .upload(fileName, s.photo);
        if (!uploadError) {
          const { data } = supabase.storage.from("outcome-photos").getPublicUrl(fileName);
          photo_url = data.publicUrl;
        }
      }

      const { data, error } = await supabase
        .from("recipes")
        .insert({
          title: s.title,
          ai_model: s.ai_model,
          chat_history: s.chat_history,
          final_recipe: s.final_recipe || null,
          outcome_photo_url: photo_url,
          author_name: s.author_name || "Anonymous",
          bread_type: s.bread_type || null,
        })
        .select()
        .single();

      if (!error && data) {
        router.push(`/recipes/${data.id}`);
      } else {
        throw new Error("Failed to save recipe");
      }
    } catch {
      setState({ step: "error", message: "Failed to submit. Please try again." });
    }
  }

  /* ── Step: Idle / Input ── */
  if (state.step === "idle" || state.step === "error") {
    const errorMsg = state.step === "error" ? state.message : null;
    return (
      <div className="container" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ marginBottom: "40px" }}>
            <p className="section-label" style={{ marginBottom: "10px" }}>Share with the community</p>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "12px" }}>
              Submit a Recipe
            </h1>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
              Paste your AI conversation below. We'll automatically extract the recipe, guess the AI model,
              and infer the bread type — then you can tweak everything before it goes live.
            </p>
          </div>

          {errorMsg && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", color: "#dc2626", fontSize: "0.875rem" }}>
              {errorMsg}
            </div>
          )}

          <div className="card" style={{ padding: "28px", marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "6px", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              Your Name
            </label>
            <input
              type="text"
              className="input"
              value={form.author_name}
              onChange={(e) => setForm({ ...form, author_name: e.target.value })}
              placeholder="Anonymous"
              style={{ marginBottom: "20px" }}
            />

            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "6px", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              AI Conversation *
            </label>
            <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginBottom: "10px", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              Paste the full chat — include your prompts and the AI responses. The more complete, the better the extraction.
            </p>
            <textarea
              required
              className="input"
              rows={16}
              style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "0.8rem", marginBottom: "20px" }}
              value={form.chat_history}
              onChange={(e) => setForm({ ...form, chat_history: e.target.value })}
              placeholder={`# you asked\n\n帮我整理一个更好的面包配方...\n\n---\n\n# gemini response\n\n帮你把这两款吐司的配方都做了升级...`}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              Supports markdown. Minimum ~200 characters for good extraction.
            </p>
          </div>

          <button
            onClick={handleExtract}
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1rem", borderRadius: "8px" }}
          >
            Extract Recipe with AI
          </button>
        </div>
      </div>
    );
  }

  /* ── Step: Extracting ── */
  if (state.step === "extracting") {
    return (
      <div className="container" style={{ paddingTop: "80px", paddingBottom: "80px", textAlign: "center" }}>
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
          <div style={{ width: "48px", height: "48px", margin: "0 auto 20px", position: "relative" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              border: "3px solid var(--border)", borderTopColor: "var(--accent)",
              animation: "spin 0.8s linear infinite",
            }} />
          </div>
          <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.5rem", fontWeight: 600, marginBottom: "8px" }}>
            Analyzing your conversation...
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            Our AI is reading through the chat to find the recipe, detect the model, and classify the bread type.
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Step: Preview ── */
  if (state.step === "preview") {
    const s = state;
    return (
      <div className="container" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: "32px" }}>
            <p className="section-label" style={{ marginBottom: "10px" }}>Review before publishing</p>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Does this look right?
            </h1>
          </div>

          {/* Editable preview card */}
          <div className="card" style={{ padding: "28px", marginBottom: "24px" }}>

            {/* Title */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Title</label>
              <input
                type="text"
                className="input"
                value={s.title}
                onChange={(e) => setState({ ...s, title: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              {/* AI Model */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>AI Model</label>
                <select
                  className="input"
                  value={s.ai_model}
                  onChange={(e) => setState({ ...s, ai_model: e.target.value })}
                >
                  {["Gemini", "ChatGPT", "Claude", "DeepSeek", "Other", "Unknown"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              {/* Bread Type */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Bread Type</label>
                <select
                  className="input"
                  value={s.bread_type}
                  onChange={(e) => setState({ ...s, bread_type: e.target.value })}
                >
                  {["Sweet", "Savory", "Sourdough", "Other"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Author */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Your Name</label>
              <input
                type="text"
                className="input"
                value={s.author_name}
                onChange={(e) => setState({ ...s, author_name: e.target.value })}
                placeholder="Anonymous"
              />
            </div>

            {/* Final Recipe */}
            {s.final_recipe && s.final_recipe !== "null" ? (
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                  Extracted Recipe
                </label>
                <textarea
                  className="input"
                  rows={10}
                  style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "0.8rem" }}
                  value={s.final_recipe}
                  onChange={(e) => setState({ ...s, final_recipe: e.target.value })}
                />
              </div>
            ) : (
              <div style={{ marginBottom: "20px", padding: "14px 16px", background: "var(--bg-muted)", borderRadius: "8px", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                No recipe extracted — only the chat history will be shown.
              </div>
            )}

            {/* Photo upload */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                Outcome Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="input"
                id="photo-upload"
                style={{ display: "none" }}
              />
              <label htmlFor="photo-upload" style={{ display: "block", cursor: "pointer" }}>
                {s.photoPreview ? (
                  <div style={{ borderRadius: "10px", overflow: "hidden", position: "relative" }}>
                    <img src={s.photoPreview} alt="Preview" style={{ width: "100%", maxHeight: "280px", objectFit: "cover" }} />
                    <div style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(0,0,0,0.55)", color: "white", fontSize: "0.75rem", padding: "4px 10px", borderRadius: "4px", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                      Click to change
                    </div>
                  </div>
                ) : (
                  <div className="upload-zone" style={{ padding: "24px" }}>
                    <svg className="upload-icon" viewBox="0 0 48 48" fill="none" style={{ width: "40px", height: "40px", margin: "0 auto 10px", display: "block", color: "var(--text-faint)" }}>
                      <rect x="6" y="10" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="2"/>
                      <path d="M16 34l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M24 26V10M18 16l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontWeight: 600, color: "var(--text-muted)", fontSize: "0.875rem" }}>
                      Add a photo of your bread (optional)
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setState({ step: "idle" })}
              className="btn-ghost"
              style={{ flex: 1, justifyContent: "center", padding: "14px" }}
            >
              ← Start Over
            </button>
            <button
              onClick={handleFinalSubmit}
              className="btn-primary"
              style={{ flex: 2, justifyContent: "center", padding: "14px", fontSize: "1rem" }}
            >
              Publish Recipe
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step: Submitting ── */
  if (state.step === "submitting") {
    return (
      <div className="container" style={{ paddingTop: "80px", paddingBottom: "80px", textAlign: "center" }}>
        <div style={{ maxWidth: "360px", margin: "0 auto" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)",
            animation: "spin 0.8s linear infinite", margin: "0 auto 20px",
          }} />
          <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.5rem", fontWeight: 600 }}>
            Publishing...
          </h2>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return null;
}
