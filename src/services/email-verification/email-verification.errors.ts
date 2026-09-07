export class EmailVerificationCooldownError extends Error {
  constructor(public readonly retryAfter: number) {
    super("請稍後再重新寄送驗證信");
    this.name = "EmailVerificationCooldownError";
  }
}
