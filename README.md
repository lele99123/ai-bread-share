# AI Bread Share

A community platform for sharing bread recipes born from AI conversations. Every recipe shows the full chat history — prompts, iterations, failures, and wins — alongside the final result and honest community reviews.

---

## What is this?

Most recipe sites show you the polished end result. This site shows the **conversation** — the back-and-forth with the AI, the troubleshooting, the iterations. You can see exactly how a recipe was developed and decide for yourself if you trust it.

**Core idea**: Share your AI chat history + outcome photo + honest review. No manufactured perfection.

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Storage + Row Level Security)
- **Fonts**: Playfair Display (headings) + DM Sans (body) via `next/font`
- **Markdown**: `react-markdown` for rendering chat histories and recipes

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/lele99123/ai-bread-share.git
cd ai-bread-share
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com), then run the schema:

1. Open your Supabase project → **SQL Editor**
2. Paste and run the contents of [`supabase-schema.sql`](./supabase-schema.sql)

This creates:
- `recipes` table — stores chat history, final recipe, photo URL, metadata
- `reviews` table — community reviews with star ratings
- `outcome-photos` storage bucket — public image uploads

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Find your credentials in Supabase: **Project Settings → API**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → select the repo
3. Add the same two Supabase environment variables in the Vercel UI
4. **Deploy** — free tier is sufficient

---

## Project Structure

```
app/
├── page.tsx                  # Home — recipe feed with filters
├── layout.tsx                # Root layout, nav, footer
├── globals.css               # Design tokens, component styles
├── submit/page.tsx           # Submit recipe form
└── recipes/[id]/page.tsx    # Recipe detail + reviews
lib/
└── supabase.ts               # Supabase client
types/
└── index.ts                  # TypeScript interfaces
supabase-schema.sql           # Run this in your Supabase SQL Editor
.env.local.example            # Template for your credentials
```

---

## The Origin Story

This project started with a single conversation between the founder and **Gemini** about adjusting a bread recipe for a bread machine. The chat covered everything from flour types and hydration adjustments to the ideal banana ripeness and troubleshooting a small loaf — a real, iterative, messy conversation that produced something genuinely useful.

That conversation is included at [`original-gemini-conversation.md`](./original-gemini-conversation.md) and was the seed idea for this platform.

---

## Contributing

This is a personal project in early stages. Ideas welcome — open an issue or reach out.

---

## License

MIT
