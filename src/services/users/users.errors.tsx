/** 該 userId 已建立過個人資料，不可重複建立 */
export class UserProfileAlreadyExistsError extends Error {
  constructor() {
    super("個人資料已存在");
    this.name = "UserProfileAlreadyExistsError";
  }
}

/** 找不到該 userId 對應的個人資料 */
export class UserProfileNotFoundError extends Error {
  constructor() {
    super("找不到個人資料");
    this.name = "UserProfileNotFoundError";
  }
}