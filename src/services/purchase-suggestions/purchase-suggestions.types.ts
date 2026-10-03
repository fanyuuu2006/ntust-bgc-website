import type { BoardGamePurchaseSuggestion } from "@/types/database";

export type PurchaseSuggestionItem = Pick<BoardGamePurchaseSuggestion,
  "id" | "game_name" | "reason" | "reference_url" | "status" | "created_at" |
  "purchase_notice_version" | "purchase_notice_unread"
>;
export type AdminPurchaseSuggestionItem = PurchaseSuggestionItem & Pick<BoardGamePurchaseSuggestion,
  "version" | "reviewed_at" | "reviewed_by_user_id"
>;
export type PurchaseNotice = Pick<PurchaseSuggestionItem, "id" | "game_name" | "purchase_notice_version">;
