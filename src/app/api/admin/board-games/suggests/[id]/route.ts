import { NextResponse, type NextRequest } from "next/server";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { rejectUnsafePurchaseSuggestionRequest, readPurchaseSuggestionBody, purchaseSuggestionErrorResponse } from "@/libs/api/purchase-suggestion-request";
import { purchaseSuggestionsService } from "@/services/purchase-suggestions/purchase-suggestions.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const unsafe = rejectUnsafePurchaseSuggestionRequest(request);
    if (unsafe) return unsafe;
    const authorization = await authorizeAdminRequest("沒有管理推薦的權限");
    if (authorization.response) return authorization.response;
    const data = await purchaseSuggestionsService.manage((await params).id, await readPurchaseSuggestionBody(request));
    return NextResponse.json({ data });
  } catch (error) { return purchaseSuggestionErrorResponse(error, "[PATCH /api/admin/board-games/suggests/[id]]"); }
}
