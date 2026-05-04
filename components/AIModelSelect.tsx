"use client";

import { useState } from "react";

const AI_META: Record<string, { icon: string; color: string }> = {
  Gemini:   { color: "#4285F4", icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 2L2 19h20L12 2zm0 4l7 11H5l7-11z'/%3E%3C/svg%3E" },
  ChatGPT:  { color: "#10A37F", icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M8 12h8M12 8v8' stroke='%2310A37F' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E" },
  Claude:   { color: "#B45309", icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 6l-4 4h3v4h2v-4h3l-4-4z'/%3E%3Ccircle cx='12' cy='12' r='9' stroke='white' stroke-width='1.5' fill='none'/%3E%3C/svg%3E" },
  DeepSeek: { color: "#646769", icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-4.5-6.5 4.5 2-7.5L2 9h7l3-7z'/%3E%3C/svg%3E" },
  Other:    { color: "#78716C", icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Ccircle cx='12' cy='12' r='9' stroke='white' stroke-width='2' fill='none'/%3E%3Cpath d='M9 9l6 6M9 15l6-6' stroke='white' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E" },
  Unknown:  { color: "#78716C", icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Ccircle cx='12' cy='12' r='9' stroke='white' stroke-width='2' fill='none'/%3E%3Cpath d='M9 9l6 6M9 15l6-6' stroke='white' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E" },
};

export function AIModelSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = AI_META[value] || AI_META.Unknown;

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
        <span
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "3px",
            background: meta.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <img src={meta.icon} alt={value} style={{ width: "10px", height: "10px" }} />
        </span>
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
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "3px",
                  background: m.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <img src={m.icon} alt={name} style={{ width: "10px", height: "10px" }} />
              </span>
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