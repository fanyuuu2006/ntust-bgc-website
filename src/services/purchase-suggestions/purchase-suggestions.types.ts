import type { BoardGamePurchaseSuggestion } from "@/types/database";

export type PurchaseSuggestionItem = Pick<BoardGamePurchaseSuggestion,
  "id" | "game_name" | "reason" | "reference_url" | "status" | "created_at"
>;
export type AdminPurchaseSuggestionRecord = PurchaseSuggestionItem & Pick<BoardGamePurchaseSuggestion,
  "version" | "reviewed_at" | "reviewed_by_user_id"
>;
export type AdminPurchaseSuggestionItem = AdminPurchaseSuggestionRecord & {
  reviewed_by_name: string | null;
};
