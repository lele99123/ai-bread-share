#!/usr/bin/env node
/**
 * Translate existing recipes to Chinese using MiniMax API.
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... MINIMAX_API_KEY=... node scripts/translate-to-cn.mjs
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_API_HOST = process.env.MINIMAX_API_HOST || "https://api.minimaxi.com";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function translateToCN(text) {
  if (!text || text.trim().length < 3) return null;
  try {
    const res = await fetch(`${MINIMAX_API_HOST}/v1/text/chatcompletion_v2`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "MiniMax-Text-01",
        messages: [
          {
            role: "system",
            content: "Translate to Simplified Chinese. Preserve all recipe formatting, measurements, temperatures, and technical terms. Only return the translation."
          },
          { role: "user", content: text }
        ],
        max_tokens: 2048,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("Translation error:", err.message);
    return null;
  }
}

async function main() {
  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, title, description")
    .or("title_cn.is.null,description_cn.is.null");

  const { data: branches } = await supabase
    .from("recipe_branches")
    .select("id, title, description, final_recipe, notes")
    .or("title_cn.is.null,description_cn.is.null,final_recipe_cn.is.null,notes_cn.is.null");

  console.log(`Translating ${recipes?.length || 0} recipes and ${branches?.length || 0} branches...`);

  for (const r of (recipes || [])) {
    const [titleCn, descCn] = await Promise.all([
      translateToCN(r.title), translateToCN(r.description)
    ]);
    if (titleCn || descCn) {
      await supabase.from("recipes").update({
        ...(titleCn && { title_cn: titleCn }),
        ...(descCn && { description_cn: descCn }),
      }).eq("id", r.id);
      console.log(`✓ Recipe: ${r.title}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  for (const b of (branches || [])) {
    const [titleCn, descCn, recipeCn, notesCn] = await Promise.all([
      translateToCN(b.title), translateToCN(b.description),
      translateToCN(b.final_recipe), translateToCN(b.notes)
    ]);
    const updates = {};
    if (titleCn) updates.title_cn = titleCn;
    if (descCn) updates.description_cn = descCn;
    if (recipeCn) updates.final_recipe_cn = recipeCn;
    if (notesCn) updates.notes_cn = notesCn;
    if (Object.keys(updates).length > 0) {
      await supabase.from("recipe_branches").update(updates).eq("id", b.id);
      console.log(`✓ Branch: ${b.title}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log("Done!");
}

main().catch(console.error);
