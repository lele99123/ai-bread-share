"use client";

import { useState } from "react";

const AI_META: Record<string, { color: string }> = {
  Gemini:   { color: "#4285F4" },
  ChatGPT:  { color: "#10A37F" },
  Claude:   { color: "#B45309" },
  DeepSeek: { color: "#646769" },
  Other:    { color: "#78716C" },
  Unknown:  { color: "#78716C" },
};

function getModelIcon(name: string): string {
  if (name === "ChatGPT") return "/openai.svg";
  if (name === "Other" || name === "Unknown") return "/file.svg";
  return `/${name.toLowerCase()}.svg`;
}

export function AIModelSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const iconPath = getModelIcon(value);

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          background: "var(--bg-card)",
          cursor: "pointer",
          fontSize: "0.875rem",
          color: "var(--text)",
        }}
      >
        <img src={iconPath} alt={value} style={{ width: "16px", height: "16px", flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{value}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="var(--text-faint)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            zIndex: 50,
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {Object.entries(AI_META).map(([name, m]) => (
            <div
              key={name}
              onClick={() => { onChange(name); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                cursor: "pointer",
                background: name === value ? "var(--bg-muted)" : "transparent",
              }}
            >
              <img src={getModelIcon(name)} alt={name} style={{ width: "16px", height: "16px", flexShrink: 0 }} />
              <span style={{ fontSize: "0.875rem", color: "var(--text)" }}>{name}</span>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 49 }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
