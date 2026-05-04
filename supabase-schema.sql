-- Run this in Supabase SQL Editor to set up the schema
-- https://supabase.com/dashboard → your project → SQL Editor

-- Recipes table — one row per distinct bread recipe from a conversation
create table if not exists recipes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  ai_model text not null,
  bread_type text,
  final_recipe text,
  outcome_photo_url text,
  notes text,
  description text,
  chat_history text not null,
  author_name text not null default 'Anonymous',
  created_at timestamp with time zone default now()
);

-- Recipe branches — iterations of the SAME recipe (same bread, different size/ingredients)
create table if not exists recipe_branches (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references recipes(id) on delete cascade,
  title text not null,
  ai_model text not null default 'Unknown',
  bread_type text,
  final_recipe text,
  outcome_photo_url text,
  notes text,
  description text,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

-- Reviews table (lives at branch level)
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references recipes(id) on delete cascade,
  branch_id uuid references recipe_branches(id) on delete cascade,
  author_name text not null default 'Anonymous',
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  is_owner_review boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (open for writes for MVP)
alter table recipes enable row level security;
alter table recipe_branches enable row level security;
alter table reviews enable row level security;

-- Allow all inserts and reads for MVP (no auth)
create policy "Allow all inserts" on recipes for insert to anon with check (true);
create policy "Allow all reads" on recipes for select to anon using (true);
create policy "Allow all inserts" on recipe_branches for insert to anon with check (true);
create policy "Allow all reads" on recipe_branches for select to anon using (true);
create policy "Allow all inserts" on reviews for insert to anon with check (true);
create policy "Allow all reads" on reviews for select to anon using (true);

-- Storage bucket for photos
insert into storage.buckets (id, name, public)
values ('outcome-photos', 'outcome-photos', true)
on conflict (id) do nothing;

create policy "Allow all uploads" on storage.objects for insert to anon with check (true);
create policy "Allow public reads" on storage.objects for select to anon using (bucket_id = 'outcome-photos');