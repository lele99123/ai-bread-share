export interface Recipe {
  id: string;
  title: string;
  ai_model: string;
  chat_history: string;
  final_recipe: string | null;
  outcome_photo_url: string | null;
  author_name: string;
  bread_type: string | null;
  created_at: string;
  avg_rating?: number;
  review_count?: number;
}

export interface Review {
  id: string;
  recipe_id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
