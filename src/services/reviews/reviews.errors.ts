export class DuplicateReviewError extends Error {
  constructor() { super("您已評論過這款桌遊。"); this.name = "DuplicateReviewError"; }
}

export class ReviewNotFoundError extends Error {
  constructor() { super("找不到這筆評論。"); this.name = "ReviewNotFoundError"; }
}
