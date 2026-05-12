/**
 * AI Model Benchmark Script
 * Compares recipe extraction quality and speed across different AI models.
 *
 * Usage: npx tsx scripts/benchmark-models.ts
 *
 * Add API keys to .env.local to enable each model:
 *   MINIMAX_API_KEY  — MiniMax (MiniMax-M2)
 *   OPENAI_API_KEY   — OpenAI (gpt-4o)
 *   ANTHROPIC_API_KEY — Anthropic (claude-sonnet-4-7)
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const EXTRACTION_PROMPT = `You are a baker and AI recipe analyst. Given a chat history between a user and an AI about making bread, your job is to extract all recipes — grouped by distinct bread type.

**Key concept — "same recipe" vs "different recipes":**
- "SAME recipe, different iteration" = same bread type with small changes → these go in ONE branch group
- "DIFFERENT recipe" = completely different bread → these are SEPARATE recipe entries

Return a JSON object with "recipes" key, each having: title, title_en, title_cn, ai_model, bread_type, description, description_en, description_cn, tags, chat_line_start, and branches array with: title, title_en, title_cn, notes, notes_en, notes_cn, final_recipe, final_recipe_en, final_recipe_cn, chat_line_start, chat_line_end, sort_order.

Rules:
- Return 1-5 recipe entries. Each recipe can have 1-4 branches. Maximum 8 branches total.
- Return ONLY the JSON object. No code fences, no preamble.
- All keys must be double-quoted strings.

Chat history follows:
`;

interface ModelResult {
  model: string;
  recipesFound: number;
  totalBranches: number;
  hasEn: boolean;
  hasCn: boolean;
  hasTags: boolean;
  hasDescription: boolean;
  hasNotes: boolean;
  durationMs: number;
  tokensUsed?: number;
  error?: string;
  rawOutput?: string;
}

function scoreResult(r: ModelResult): number {
  let score = 0;
  if (r.error) return 0;
  score += Math.min(r.recipesFound, 3) * 10;
  score += Math.min(r.totalBranches, 4) * 5;
  if (r.hasEn) score += 10;
  if (r.hasCn) score += 10;
  if (r.hasTags) score += 10;
  if (r.hasDescription) score += 10;
  if (r.hasNotes) score += 10;
  return score;
}

async function runMiniMax(chatHistory: string): Promise<ModelResult> {
  const start = Date.now();
  try {
    const client = new Anthropic({
      baseURL: "https://api.minimaxi.com/anthropic",
      apiKey: process.env.MINIMAX_API_KEY!,
    });
    const msg = await client.messages.create({
      model: "MiniMax-M2",
      max_tokens: 8000,
      messages: [{ role: "user", content: EXTRACTION_PROMPT + chatHistory }],
    });
    const text = msg.content.find((b) => b.type === "text")?.type === "text"
      ? (msg.content.find((b) => b.type === "text") as any).text
      : "";
    const parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
    return {
      model: "MiniMax-M2",
      recipesFound: Array.isArray(parsed.recipes) ? parsed.recipes.length : 0,
      totalBranches: Array.isArray(parsed.recipes) ? parsed.recipes.reduce((s: number, r: any) => s + (Array.isArray(r.branches) ? r.branches.length : 0), 0) : 0,
      hasEn: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => r.title_en),
      hasCn: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => r.title_cn),
      hasTags: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => Array.isArray(r.tags) && r.tags.length > 0),
      hasDescription: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => r.description_en),
      hasNotes: Array.isArray(parsed.recipes) && parsed.recipes.some((r: any) => r.branches?.some((b: any) => b.notes_en)),
      durationMs: Date.now() - start,
      rawOutput: text.slice(0, 200),
    };
  } catch (e: any) {
    return { model: "MiniMax-M2", recipesFound: 0, totalBranches: 0, hasEn: false, hasCn: false, hasTags: false, hasDescription: false, hasNotes: false, durationMs: Date.now() - start, error: e.message };
  }
}

async function runOpenAI(chatHistory: string): Promise<ModelResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { model: "gpt-4o", recipesFound: 0, totalBranches: 0, hasEn: false, hasCn: false, hasTags: false, hasDescription: false, hasNotes: false, durationMs: 0, error: "OPENAI_API_KEY not set" };
  }
  const start = Date.now();
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const msg = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 8000,
      messages: [{ role: "user", content: EXTRACTION_PROMPT + chatHistory }],
    });
    const text = msg.choices[0]?.message?.content || "";
    const parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
    return {
      model: "gpt-4o",
      recipesFound: Array.isArray(parsed.recipes) ? parsed.recipes.length : 0,
      totalBranches: Array.isArray(parsed.recipes) ? parsed.recipes.reduce((s: number, r: any) => s + (Array.isArray(r.branches) ? r.branches.length : 0), 0) : 0,
      hasEn: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => r.title_en),
      hasCn: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => r.title_cn),
      hasTags: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => Array.isArray(r.tags) && r.tags.length > 0),
      hasDescription: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => r.description_en),
      hasNotes: Array.isArray(parsed.recipes) && parsed.recipes.some((r: any) => r.branches?.some((b: any) => b.notes_en)),
      durationMs: Date.now() - start,
      tokensUsed: msg.usage?.total_tokens,
      rawOutput: text.slice(0, 200),
    };
  } catch (e: any) {
    return { model: "gpt-4o", recipesFound: 0, totalBranches: 0, hasEn: false, hasCn: false, hasTags: false, hasDescription: false, hasNotes: false, durationMs: Date.now() - start, error: e.message };
  }
}

async function runAnthropic(chatHistory: string): Promise<ModelResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { model: "claude-sonnet-4-7", recipesFound: 0, totalBranches: 0, hasEn: false, hasCn: false, hasTags: false, hasDescription: false, hasNotes: false, durationMs: 0, error: "ANTHROPIC_API_KEY not set" };
  }
  const start = Date.now();
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-7",
      max_tokens: 8000,
      messages: [{ role: "user", content: EXTRACTION_PROMPT + chatHistory }],
    });
    const text = msg.content.find((b) => b.type === "text")?.type === "text"
      ? (msg.content.find((b) => b.type === "text") as any).text
      : "";
    const parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
    return {
      model: "claude-sonnet-4-7",
      recipesFound: Array.isArray(parsed.recipes) ? parsed.recipes.length : 0,
      totalBranches: Array.isArray(parsed.recipes) ? parsed.recipes.reduce((s: number, r: any) => s + (Array.isArray(r.branches) ? r.branches.length : 0), 0) : 0,
      hasEn: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => r.title_en),
      hasCn: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => r.title_cn),
      hasTags: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => Array.isArray(r.tags) && r.tags.length > 0),
      hasDescription: Array.isArray(parsed.recipes) && parsed.recipes.every((r: any) => r.description_en),
      hasNotes: Array.isArray(parsed.recipes) && parsed.recipes.some((r: any) => r.branches?.some((b: any) => b.notes_en)),
      durationMs: Date.now() - start,
      rawOutput: text.slice(0, 200),
    };
  } catch (e: any) {
    return { model: "claude-sonnet-4-7", recipesFound: 0, totalBranches: 0, hasEn: false, hasCn: false, hasTags: false, hasDescription: false, hasNotes: false, durationMs: Date.now() - start, error: e.message };
  }
}

const SAMPLE_CHAT = `# you asked

帮我整理一个更好的面包配方...

---

# gemini response

帮你把这两款吐司的配方都做了升级...

---

# you asked

如果我想加入香蕉呢？...

# gemini response

加入香蕉意味着配方需要进行大手术...

---

# you asked

那做一个简单的没有香蕉的版本吧

# gemini response

好的，我来给你设计一个简单的基础吐司配方，只需要面粉、水、酵母和盐...`;

async function main() {
  console.log("=".repeat(70));
  console.log("AI Model Benchmark — Recipe Extraction");
  console.log("=".repeat(70));
  console.log();

  const results = await Promise.all([
    runMiniMax(SAMPLE_CHAT),
    runOpenAI(SAMPLE_CHAT),
    runAnthropic(SAMPLE_CHAT),
  ]);

  console.log(`| Model               | Recipes | Branches | EN  | CN  | Tags | Desc | Notes | Score | Time  |`);
  console.log(`|---------------------|---------|----------|-----|-----|------|------|-------|-------|-------|`);

  for (const r of results) {
    const s = scoreResult(r);
    console.log(
      `| ${r.model.padEnd(19)} | ${String(r.recipesFound).padStart(7)} | ${String(r.totalBranches).padStart(8)} | ${r.error ? "ERR" : (r.hasEn ? "✓" : "✗").padEnd(3)} | ${r.error ? "ERR" : (r.hasCn ? "✓" : "✗").padEnd(3)} | ${r.error ? "ERR" : (r.hasTags ? "✓" : "✗").padEnd(4)} | ${r.error ? "ERR" : (r.hasDescription ? "✓" : "✗").padEnd(4)} | ${r.error ? "ERR" : (r.hasNotes ? "✓" : "✗").padEnd(5)} | ${String(s).padStart(5)} | ${String(r.durationMs + "ms").padStart(5)} |`
    );
    if (r.error) {
      console.log(`  ERROR: ${r.error}`);
    }
  }

  console.log();
  const ranked = [...results].sort((a, b) => scoreResult(b) - scoreResult(a));
  console.log("Winner:", ranked[0].model, `(${scoreResult(ranked[0])} pts)`);
}

main().catch(console.error);
