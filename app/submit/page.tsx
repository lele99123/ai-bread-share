"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const AI_MODELS = ["Gemini", "ChatGPT", "Claude", "DeepSeek", "Other"];
const BREAD_TYPES = ["Sweet", "Savory", "Sourdough", "Other"];

export default function SubmitPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    ai_model: "Gemini",
    author_name: "",
    bread_type: "",
    chat_history: "",
    final_recipe: "",
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let photo_url: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop();
        const fileName = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("outcome-photos")
          .upload(fileName, photo);
        if (!uploadError) {
          const { data } = supabase.storage.from("outcome-photos").getPublicUrl(fileName);
          photo_url = data.publicUrl;
        }
      }
      const { data, error } = await supabase
        .from("recipes")
        .insert({
          title: form.title,
          ai_model: form.ai_model,
          chat_history: form.chat_history,
          final_recipe: form.final_recipe || null,
          outcome_photo_url: photo_url,
          author_name: form.author_name || "Anonymous",
          bread_type: form.bread_type || null,
        })
        .select()
        .single();

      if (!error && data) {
        router.push(`/recipes/${data.id}`);
      } else {
        alert("Failed to submit. Please check your Supabase configuration.");
        setSubmitting(false);
      }
    } catch {
      alert("An error occurred.");
      setSubmitting(false);
    }
  }

  const fieldStyle: React.CSSProperties = {
    marginBottom: '20px',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '6px',
    fontFamily: "'DM Sans', sans-serif",
  };
  const hintStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'var(--text-faint)',
    marginTop: '4px',
    fontFamily: "'DM Sans', sans-serif",
  };
  const sectionTitle: React.CSSProperties = {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border)',
  };

  return (
    <div className="container" style={{ paddingTop: '48px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <p className="section-label" style={{ marginBottom: '10px' }}>Share with the community</p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Submit a Recipe
          </h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Paste your AI conversation, tell us what you made, and share how it turned out.
            Honest stories — including failures — are welcome.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Basic Info ── */}
          <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
            <h2 style={sectionTitle}>Basic Info</h2>

            <div style={fieldStyle}>
              <label style={labelStyle}>Recipe Title</label>
              <input
                type="text"
                required
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Banana Milk Toast — 3 iterations with Gemini"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>AI Model</label>
                <select
                  className="input"
                  value={form.ai_model}
                  onChange={(e) => setForm({ ...form, ai_model: e.target.value })}
                >
                  {AI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Bread Type</label>
                <select
                  className="input"
                  value={form.bread_type}
                  onChange={(e) => setForm({ ...form, bread_type: e.target.value })}
                >
                  <option value="">Select type...</option>
                  {BREAD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Your Name</label>
              <input
                type="text"
                className="input"
                value={form.author_name}
                onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                placeholder="Anonymous"
              />
            </div>
          </div>

          {/* ── Chat History ── */}
          <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
            <h2 style={sectionTitle}>AI Conversation</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
              Paste the full chat history. Include your prompts and the AI responses — this is the heart of the site.
              Markdown is supported.
            </p>
            <textarea
              required
              className="input"
              rows={14}
              style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.8125rem' }}
              value={form.chat_history}
              onChange={(e) => setForm({ ...form, chat_history: e.target.value })}
              placeholder={`# you asked\n\n帮我整理一个更好的面包配方...\n\n---\n\n# gemini response\n\n帮你把这两款吐司的配方都做了升级...`}
            />
          </div>

          {/* ── Final Recipe ── */}
          <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
            <h2 style={sectionTitle}>Final Recipe</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
              Optional. If you have a cleaned-up recipe (ingredients + steps), paste it here.
              Otherwise the last AI response will serve as the recipe.
            </p>
            <textarea
              className="input"
              rows={10}
              style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.8125rem' }}
              value={form.final_recipe}
              onChange={(e) => setForm({ ...form, final_recipe: e.target.value })}
              placeholder={`### Ingredients\n- Flour: 300g\n- ...\n\n### Steps\n1. Mix dry ingredients...`}
            />
          </div>

          {/* ── Photo ── */}
          <div className="card" style={{ padding: '28px', marginBottom: '32px' }}>
            <h2 style={sectionTitle}>Outcome Photo</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
              A photo of your final bread makes the recipe much more compelling.
              Strongly recommended.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="input"
              id="photo-upload"
              style={{ display: 'none' }}
            />
            <label htmlFor="photo-upload" style={{ display: 'block' }}>
              {photoPreview ? (
                <div style={{ borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                  <img src={photoPreview} alt="Preview" style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block' }} />
                  <div style={{
                    position: 'absolute', bottom: '12px', right: '12px',
                    background: 'rgba(0,0,0,0.55)', color: 'white',
                    fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    Click to change
                  </div>
                </div>
              ) : (
                <div className="upload-zone">
                  <svg className="upload-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="10" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M16 34l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M24 26V10M18 16l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Click to upload a photo
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                    PNG, JPG, WEBP up to 5MB
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', borderRadius: '8px' }}
          >
            {submitting ? "Submitting..." : "Submit Recipe"}
          </button>

        </form>
      </div>
    </div>
  );
}
