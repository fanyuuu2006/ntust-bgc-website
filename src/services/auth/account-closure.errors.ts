export class AccountClosureBlockedError extends Error {
  constructor() {
    super("目前仍有待處理或尚未歸還的桌遊，請先完成相關借用流程後再註銷帳號。");
    this.name = "AccountClosureBlockedError";
  }
}
