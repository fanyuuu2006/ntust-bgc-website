export class EventNotFoundError extends Error {
  constructor() {
    super("找不到活動");
    this.name = "EventNotFoundError";
  }
}

export class SelfCheckInMembershipRequiredError extends Error {
  constructor() {
    super("僅限目前社員自行簽到");
    this.name = "SelfCheckInMembershipRequiredError";
  }
}

export class SelfCheckInClosedError extends Error {
  constructor() {
    super("目前不在可簽到時間內");
    this.name = "SelfCheckInClosedError";
  }
}

export class SelfCheckInAlreadyCompletedError extends Error {
  constructor() {
    super("你已完成簽到");
    this.name = "SelfCheckInAlreadyCompletedError";
  }
}
