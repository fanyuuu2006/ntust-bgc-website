export class BoardNotFoundError extends Error {
  constructor() {
    super("桌遊不存在");
    this.name = "BoardNotFoundError";
  }
}

export class DuplicateInventoryNumberError extends Error {
  constructor() {
    super("該編號已存在");
    this.name = "DuplicateInventoryNumberError";
  }
}

export class BorrowingNotFoundError extends Error {
  constructor() {
    super("借用紀錄不存在");
    this.name = "BorrowingNotFoundError";
  }
}

export class BoardGameCategoryNotFoundError extends Error {
  constructor() {
    super("桌遊分類不存在");
    this.name = "BoardGameCategoryNotFoundError";
  }
}

export class DuplicateBoardGameCategoryNameError extends Error {
  constructor() {
    super("分類名稱已存在");
    this.name = "DuplicateBoardGameCategoryNameError";
  }
}

export class BoardGameCategoryInUseError extends Error {
  constructor() {
    super("此分類仍有桌遊使用，無法刪除");
    this.name = "BoardGameCategoryInUseError";
  }
}

export class BoardGameLocationNotFoundError extends Error {
  constructor() {
    super("桌遊位置不存在");
    this.name = "BoardGameLocationNotFoundError";
  }
}

export class DuplicateBoardGameLocationNameError extends Error {
  constructor() {
    super("位置名稱已存在");
    this.name = "DuplicateBoardGameLocationNameError";
  }
}

export class BoardGameLocationInUseError extends Error {
  constructor() {
    super("此位置仍有桌遊使用，無法刪除");
    this.name = "BoardGameLocationInUseError";
  }
}

export class BoardGameHasOpenBorrowingError extends Error {
  constructor() {
    super("此桌遊尚有進行中的借用紀錄，無法刪除");
    this.name = "BoardGameHasOpenBorrowingError";
  }
}
