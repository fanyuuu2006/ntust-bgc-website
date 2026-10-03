export class PurchaseSuggestionError extends Error {
  constructor(message: string, public readonly status: 403 | 404 | 409 | 429, public readonly retryAfter?: number) {
    super(message);
  }
}
