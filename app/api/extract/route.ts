import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  baseURL: "https://api.minimaxi.com/anthropic",
  apiKey: process.env.MINIMAX_API_KEY!,
});

const EXTRACTION_PROMPT = `You are a baker and AI recipe analyst. Given a chat history between a user and an AI about making bread, extract the following and return ONLY valid JSON (no markdown, no explanation):

{
  "title": "A short, descriptive recipe title in English (max 60 chars)",
  "ai_model": "The AI model name (e.g. Gemini, ChatGPT, Claude, DeepSeek, or Other)",
  "bread_type": "One of: Sweet, Savory, Sourdough, Other",
  "final_recipe": "The final recipe extracted from the conversation, formatted in clean markdown with ### Ingredients and ### Steps sections. Include exact measurements. If no clear recipe exists, say 'null' for this field."
}

Rules:
- title should be specific and descriptive, e.g. "Banana Milk Toast — Gemini Iteration 3"
- ai_model: detect from conversation context (Gemini, ChatGPT/ChatGPT-4, Claude, DeepSeek, or Other)
- bread_type: judge from ingredients and flavor profile
- final_recipe: extract the best version of the recipe discussed — the most refined/updated version, not the first draft. Use null if the conversation is only troubleshooting without producing a usable recipe.
- Return ONLY the JSON. No preamble, no explanation.
- JSON keys must be double-quoted.
- If bread_type is unclear, default to "Sweet".
- If no recipe can be extracted at all, use null for title and final_recipe and set ai_model to "Unknown".

Chat history:
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
      max_tokens: 2000,
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

    // Sanity-check the response
    if (!parsed.title || typeof parsed.title !== "string") {
      parsed.title = "Untitled Recipe";
    }
    if (!parsed.ai_model || typeof parsed.ai_model !== "string") {
      parsed.ai_model = "Unknown";
    }
    if (!["Sweet", "Savory", "Sourdough", "Other"].includes(parsed.bread_type)) {
      parsed.bread_type = "Sweet";
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("Extraction failed:", err?.message);
    return NextResponse.json({ error: "Extraction failed. Check MINIMAX_API_KEY." }, { status: 500 });
  }
}
