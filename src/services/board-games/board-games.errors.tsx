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

export class BoardGameNotAvailableForBorrowingError extends Error {
  constructor() {
    super("此桌遊目前無法借用");
    this.name = "BoardGameNotAvailableForBorrowingError";
  }
}

export class BoardGameBorrowingConflictError extends Error {
  constructor() {
    super("已有進行中的借用申請，請勿重複申請");
    this.name = "BoardGameBorrowingConflictError";
  }
}

export class BorrowingPermissionError extends Error {
  constructor() {
    super("目前沒有權限進行此借用操作");
    this.name = "BorrowingPermissionError";
  }
}

export class BorrowingStatusTransitionError extends Error {
  constructor(expectedStatus: string, actualStatus: string) {
    super(`只能從 ${expectedStatus} 狀態進行此操作，目前狀態為 ${actualStatus}`);
    this.name = "BorrowingStatusTransitionError";
  }
}
