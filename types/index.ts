export interface Recipe {
  id: string;
  title: string;
  title_en: string | null;
  title_cn: string | null;
  ai_model: string;
  bread_type: string | null;
  final_recipe: string | null;
  outcome_photo_url: string | null;
  notes: string | null;
  description: string | null;
  description_en: string | null;
  description_cn: string | null;
  chat_history: string;
  author_name: string;
  author_id: string | null;
  created_at: string;
  avg_rating?: number;
  review_count?: number;
  branches?: RecipeBranch[];
}

export interface RecipeBranch {
  id: string;
  recipe_id: string;
  title: string;
  title_en: string | null;
  title_cn: string | null;
  ai_model: string;
  bread_type: string | null;
  final_recipe: string | null;
  final_recipe_en: string | null;
  final_recipe_cn: string | null;
  outcome_photo_url: string | null;
  notes: string | null;
  notes_en: string | null;
  notes_cn: string | null;
  description: string | null;
  tags: string[];
  sort_order: number;
  chat_line_start: number | null;
  chat_line_end: number | null;
  created_at: string;
  avg_rating?: number;
  review_count?: number;
}

export interface Review {
  id: string;
  recipe_id: string;
  branch_id: string | null;
  author_name: string;
  author_id: string | null;
  rating: number;
  comment: string | null;
  is_owner_review: boolean;
  created_at: string;
}