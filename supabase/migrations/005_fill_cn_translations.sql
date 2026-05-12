-- Migration: Fill _cn translations from _en columns
-- Run this in your Supabase dashboard SQL editor or via CLI

-- recipes table
UPDATE public.recipes SET title_cn = title_en WHERE title_cn IS NULL AND title_en IS NOT NULL;
UPDATE public.recipes SET description_cn = description_en WHERE description_cn IS NULL AND description_en IS NOT NULL;
UPDATE public.recipes SET notes_cn = notes_en WHERE notes_cn IS NULL AND notes_en IS NOT NULL;

-- recipe_branches table
UPDATE public.recipe_branches SET title_cn = title_en WHERE title_cn IS NULL AND title_en IS NOT NULL;
UPDATE public.recipe_branches SET final_recipe_cn = final_recipe_en WHERE final_recipe_cn IS NULL AND final_recipe_en IS NOT NULL;
UPDATE public.recipe_branches SET notes_cn = notes_en WHERE notes_cn IS NULL AND notes_en IS NOT NULL;

-- reviews table
UPDATE public.reviews SET comment_cn = comment_en WHERE comment_cn IS NULL AND comment_en IS NOT NULL;
