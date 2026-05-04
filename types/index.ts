export interface Recipe {
  id: string;
  title: string;
  chat_history: string;
  author_name: string;
  created_at: string;
  branches?: RecipeBranch[];
  branch_count?: number;
}

export interface RecipeBranch {
  id: string;
  recipe_id: string;
  title: string;
  ai_model: string;
  bread_type: string | null;
  final_recipe: string | null;
  outcome_photo_url: string | null;
  sort_order: number;
  created_at: string;
  reviews?: Review[];
  avg_rating?: number;
  review_count?: number;
}

export interface Review {
  id: string;
  recipe_id: string;
  branch_id: string | null;
  author_name: string;
  rating: number;
  comment: string | null;
  is_owner_review: boolean;
  created_at: string;
}
