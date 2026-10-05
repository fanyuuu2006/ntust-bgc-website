import type { BoardGamePurchaseSuggestion } from "@/types/database";

export type PurchaseSuggestionItem = Pick<BoardGamePurchaseSuggestion,
  "id" | "game_name" | "reason" | "reference_url" | "status" | "created_at"
>;
export type AdminPurchaseSuggestionItem = PurchaseSuggestionItem & Pick<BoardGamePurchaseSuggestion,
  "version" | "reviewed_at" | "reviewed_by_user_id"
>;
