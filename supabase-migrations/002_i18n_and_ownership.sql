-- Migration: Add i18n fields + author ownership + enhanced reviews

-- 1. Add author ownership to recipes
alter table recipes add column if not exists author_id uuid;

-- 2. Add bilingual fields to recipes
alter table recipes add column if not exists title_en text;
alter table recipes add column if not exists title_cn text;
alter table recipes add column if not exists description_en text;
alter table recipes add column if not exists description_cn text;

-- 3. Add bilingual fields to recipe_branches
alter table recipe_branches add column if not exists title_en text;
alter table recipe_branches add column if not exists title_cn text;
alter table recipe_branches add column if not exists description_en text;
alter table recipe_branches add column if not exists description_cn text;
alter table recipe_branches add column if not exists final_recipe_en text;
alter table recipe_branches add column if not exists final_recipe_cn text;
alter table recipe_branches add column if not exists notes_en text;
alter table recipe_branches add column if not exists notes_cn text;

-- 4. Enhance reviews table
alter table reviews add column if not exists accuracy_rating integer check (accuracy_rating >= 1 and accuracy_rating <= 5);
alter table reviews add column if not exists comment_en text;
alter table reviews add column if not exists comment_cn text;
alter table reviews add column if not exists author_id uuid;

-- 5. Backfill existing data (copy title → title_en, etc.)
update recipes set title_en = title where title_en is null;
update recipes set description_en = description where description_en is null;
update recipe_branches set title_en = title where title_en is null;
update recipe_branches set description_en = description where description_en is null;
update recipe_branches set final_recipe_en = final_recipe where final_recipe_en is null;
update recipe_branches set notes_en = notes where notes_en is null;
update reviews set comment_en = comment where comment_en is null;

-- 6. Indexes for benchmark queries
create index if not exists idx_reviews_accuracy_rating on reviews(accuracy_rating) where accuracy_rating is not null;
create index if not exists idx_recipes_author_id on recipes(author_id) where author_id is not null;
create index if not exists idx_recipe_branches_ai_model on recipe_branches(ai_model);

-- 7. Function to claim ownership of existing anonymous recipes by author_name
create or replace function claim_recipes_by_author_name(p_author_name text, p_author_id uuid)
returns setof uuid as $$
  update recipes
  set author_id = p_author_id
  where author_name = p_author_name and author_id is null
  returning id;
$$ language sql security definer;
