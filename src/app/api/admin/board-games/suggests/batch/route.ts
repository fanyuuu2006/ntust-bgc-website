import { NextResponse, type NextRequest } from "next/server";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import {
  purchaseSuggestionErrorResponse,
  readPurchaseSuggestionBody,
  rejectUnsafePurchaseSuggestionRequest,
} from "@/libs/api/purchase-suggestion-request";
import { purchaseSuggestionsService } from "@/services/purchase-suggestions/purchase-suggestions.service";

export async function PATCH(request: NextRequest) {
  try {
    const unsafe = rejectUnsafePurchaseSuggestionRequest(request);
    if (unsafe) return unsafe;
    const authorization = await authorizeAdminRequest("沒有管理推薦的權限");
    if (authorization.response) return authorization.response;
    const data = await purchaseSuggestionsService.manageMany(
      authorization.user.id,
      await readPurchaseSuggestionBody(request),
    );
    return NextResponse.json({ data });
  } catch (error) {
    return purchaseSuggestionErrorResponse(
      error,
      "[PATCH /api/admin/board-games/suggests/batch]",
    );
  }
}
