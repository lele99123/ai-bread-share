import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  baseURL: "https://api.minimaxi.com/anthropic",
  apiKey: process.env.MINIMAX_API_KEY!,
});

const EXTRACTION_PROMPT = `You are a baker and AI recipe analyst. Given a chat history between a user and an AI about making bread, your job is to extract EVERY distinct recipe discussed in this conversation.

IMPORTANT: A single chat often contains MULTIPLE completely different recipes — NOT just iterations of the same recipe. Look carefully for:

1. A new recipe section (the AI or user explicitly names or describes a new bread type, e.g. "recipe 2", "another bread", "let's try [different bread name]")
2. A fundamentally different flavor profile or ingredient base — even if the AI iterates on it later
3. Separate recipes that share a chat thread but have distinct identities (e.g. "milk toast" vs "black sugar longan toast" vs "italian garlic bread")

You must return an ARRAY of branches — one entry per DISTINCT recipe. Do NOT merge separate recipes into one.

Return ONLY a valid JSON array. No markdown, no explanation, no text outside the array.

Format:
[
  {
    "title": "Short descriptive title for THIS specific recipe (max 70 chars). Include the bread name and any distinguishing adjective, e.g. 'Milk Toast (Original)', 'Black Sugar Longan Toast', 'Italian Garlic Herb Bread'",
    "ai_model": "Detect from context: Gemini, ChatGPT, Claude, DeepSeek, or Other",
    "bread_type": "One of: Sweet, Savory, Sourdough, Other",
    "description": "A brief 1-2 sentence description of this bread — its flavor profile, texture, or what makes it special. e.g. 'A fluffy Japanese-style milk toast with a golden crust and soft, pillowy crumb. The duration provides a subtle sweetness without being overly rich.'",
    "final_recipe": "The final refined version of THIS recipe in clean markdown: ### Ingredients (with exact grams/ml) and ### Steps. Extract ONLY what belongs to this recipe — do NOT mix in ingredients or steps from other recipes. If no usable recipe exists for this branch, use null.",
    "notes": "One sentence on what makes this recipe distinct or what changed from earlier versions. e.g. 'Base recipe before banana was added', 'Completely different bread — Italian style with olive oil', 'Scaled to 2lb size with adjusted hydration'"
  },
  ...
]

Rules:
- Return AT LEAST one branch. If the chat discusses 4 distinct breads, return 4 entries.
- Title each branch uniquely and descriptively — the titles should clearly distinguish between different breads.
- description: write a brief description every time, even if the recipe content is sparse
- ai_model: same for all branches (detect once from context)
- bread_type: judge per recipe independently
- final_recipe: extract ONLY the ingredients and steps for that specific recipe. Do not copy ingredients from recipe A into recipe B.
- If the chat discusses 3+ distinct breads, return 3+ entries. Maximum 8 entries.
- Return ONLY the JSON array. No code fences, no preamble, no explanation.
- All keys must be double-quoted strings.
- If a recipe has no clear ingredients/steps but is mentioned, include it with title and notes explaining why it couldn't be extracted.

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

    // Ensure it's always an array
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    const branches = parsed.map((branch: any) => ({
      title: branch.title && typeof branch.title === "string" ? branch.title : "Untitled Recipe",
      ai_model: ["Gemini", "ChatGPT", "Claude", "DeepSeek", "Other"].find((m) =>
        (branch.ai_model || "").toLowerCase().includes(m.toLowerCase())
      ) || "Unknown",
      bread_type: ["Sweet", "Savory", "Sourdough", "Other"].includes(branch.bread_type)
        ? branch.bread_type
        : "Sweet",
      description: branch.description && typeof branch.description === "string" ? branch.description : null,
      final_recipe: branch.final_recipe && typeof branch.final_recipe === "string" ? branch.final_recipe : null,
      notes: branch.notes && typeof branch.notes === "string" ? branch.notes : null,
    }));

    if (branches.length === 0) {
      return NextResponse.json({ error: "No recipes could be extracted from this conversation." }, { status: 422 });
    }

    return NextResponse.json({ branches });
  } catch (err: any) {
    console.error("Extraction failed:", err?.message);
    return NextResponse.json({ error: "Extraction failed. Check MINIMAX_API_KEY." }, { status: 500 });
  }
}
