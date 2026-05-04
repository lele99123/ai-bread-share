import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  baseURL: "https://api.minimaxi.com/anthropic",
  apiKey: process.env.MINIMAX_API_KEY!,
});

const EXTRACTION_PROMPT = `You are a baker and AI recipe analyst. Given a chat history between a user and an AI about making bread, your job is to extract all recipes — grouped by distinct bread type.

**Key concept — "same recipe" vs "different recipes":**
- "SAME recipe, different iteration" = same bread type with small changes (flour swap, size change, oil type change, banana added, etc.) → these go in ONE branch group
- "DIFFERENT recipe" = completely different bread (milk toast vs garlic bread vs sourdough) → these are SEPARATE recipe entries

Group iterations of the SAME recipe together. The first/primary iteration gets sort_order=0, the second gets sort_order=1, etc.

Also track where in the chat each recipe FIRST appears. Use line numbers (counting from 0, each newline is a line) to mark chat_line_start. This lets us jump back to the exact chat section.

Return a JSON object (NOT an array) with "recipes" key:
{
  "recipes": [
    {
      "title": "Milk Toast — Base Recipe",
      "ai_model": "Gemini",
      "bread_type": "Sweet",
      "description": "A brief 1-2 sentence description of this bread...",
      "tags": ["banana", "sweet", "milk", "soft-crumb"],
      "chat_line_start": 0,
      "branches": [
        {
          "title": "Milk Toast — 1.5lb (Original)",
          "notes": "Base recipe before any modifications",
          "final_recipe": "### Ingredients\\n- ...\\n### Steps\\n...",
          "chat_line_start": 0,
          "chat_line_end": 45,
          "sort_order": 0
        },
        {
          "title": "Milk Toast — 2lb with Banana",
          "notes": "Added 120g banana, reduced water by 40g to compensate",
          "final_recipe": "### Ingredients\\n- ...\\n### Steps\\n...",
          "chat_line_start": 46,
          "chat_line_end": 92,
          "sort_order": 1
        }
      ]
    },
    {
      "title": "Italian Garlic Herb Bread",
      "ai_model": "Gemini",
      "bread_type": "Savory",
      "description": "A rustic Italian-style bread with garlic, rosemary, and olive oil...",
      "tags": ["garlic", "rosemary", "savory", "crusty"],
      "chat_line_start": 120,
      "branches": [
        {
          "title": "Italian Garlic Bread — 1lb",
          "notes": "First attempt with fresh rosemary",
          "final_recipe": "...",
          "chat_line_start": 120,
          "chat_line_end": 165,
          "sort_order": 0
        }
      ]
    }
  ]
}

Rules:
- Each entry in "recipes" = one DISTINCT bread type (e.g. "Milk Toast" or "Italian Garlic Bread")
- Track FIRST occurrence: chat_line_start = line number where this recipe first appears in the chat (0-indexed)
- For branches: chat_line_start/chat_line_end = the specific line range where THIS branch iteration appears
- Each bread type can have 1+ branches representing iterations of that SAME recipe
- ai_model: detect once per recipe group, apply to all branches in that group
- bread_type: set per recipe
- description: write for the recipe (applies to all branches), even if recipe content is sparse
- tags: extract 2-6 comma-separated keywords describing the bread — ingredients (banana, chocolate, cheese), qualities (sweet, savory, soft-crumb, crusty), techniques (sourdough, fermentation) — NOT the title words
- Title each recipe distinctly — milk toast branches should share "Milk Toast" prefix so they visually group together
- branches: title should distinguish iteration (size, ingredient change). notes describe what changed. final_recipe is per-branch
- Return 1-5 recipe entries. Each recipe can have 1-4 branches. Maximum 8 branches total across all recipes.
- Return ONLY the JSON object. No code fences, no preamble, no explanation.
- All keys must be double-quoted strings.

Chat history follows:
`;

export async function POST(req: NextRequest) {
  if (!process.env.MINIMAX_API_KEY) {
    return NextResponse.json({ error: "MINIMAX_API_KEY not configured" }, { status: 500 });
  }

  const { chat_history } = await req.json();

  if (!chat_history || chat_history.trim().length < 50) {
    return NextResponse.json({ error: "Chat history too short to extract a recipe" }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: "MiniMax-M2.7",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: EXTRACTION_PROMPT + chat_history,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text.trim() : "";

    // Strip any markdown code fences
    const jsonStr = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed = JSON.parse(jsonStr);

    // Normalize to { recipes: [...] }
    if (!parsed.recipes) {
      // API returned flat array — convert to grouped format
      if (Array.isArray(parsed)) {
        parsed = { recipes: parsed.map((p: any, i: number) => ({ ...p, sort_order: i })) };
      } else {
        throw new Error("Unexpected response format from extraction model");
      }
    }

    const recipes = parsed.recipes.map((recipe: any) => ({
      title: recipe.title && typeof recipe.title === "string" ? recipe.title : "Untitled Recipe",
      ai_model: ["Gemini", "ChatGPT", "Claude", "DeepSeek", "Other"].find((m) =>
        (recipe.ai_model || "").toLowerCase().includes(m.toLowerCase())
      ) || "Unknown",
      bread_type: ["Sweet", "Savory", "Sourdough", "Other"].includes(recipe.bread_type)
        ? recipe.bread_type
        : "Sweet",
      description: recipe.description && typeof recipe.description === "string" ? recipe.description : null,
      tags: Array.isArray(recipe.tags) ? recipe.tags.filter((t: any) => typeof t === "string") : [],
      branches: (recipe.branches || []).map((b: any, i: number) => ({
        title: b.title && typeof b.title === "string" ? b.title : `Iteration ${i + 1}`,
        notes: b.notes && typeof b.notes === "string" ? b.notes : null,
        final_recipe: b.final_recipe && typeof b.final_recipe === "string" ? b.final_recipe : null,
        chat_line_start: typeof b.chat_line_start === "number" ? b.chat_line_start : null,
        chat_line_end: typeof b.chat_line_end === "number" ? b.chat_line_end : null,
        sort_order: typeof b.sort_order === "number" ? b.sort_order : i,
      })),
    }));

    if (recipes.length === 0) {
      return NextResponse.json({ error: "No recipes could be extracted from this conversation." }, { status: 422 });
    }

    return NextResponse.json({ recipes });
  } catch (err: any) {
    console.error("Extraction failed:", err?.message);
    return NextResponse.json({ error: "Extraction failed. Check MINIMAX_API_KEY." }, { status: 500 });
  }
}
