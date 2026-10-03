import { NextResponse, type NextRequest } from "next/server";
import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { rejectUnsafePurchaseSuggestionRequest, readPurchaseSuggestionBody, purchaseSuggestionErrorResponse } from "@/libs/api/purchase-suggestion-request";
import { purchaseSuggestionsService } from "@/services/purchase-suggestions/purchase-suggestions.service";

export async function POST(request: NextRequest) {
  try {
    const unsafe = rejectUnsafePurchaseSuggestionRequest(request);
    if (unsafe) return unsafe;
    const authorization = await authorizeVerifiedRequest();
    if (authorization.response) return authorization.response;
    const data = await purchaseSuggestionsService.submit(await readPurchaseSuggestionBody(request));
    return NextResponse.json({ data }, { status: data.replayed ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return purchaseSuggestionErrorResponse(error, "[POST /api/purchase-suggestions]"); }
}
