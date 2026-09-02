export class EventNotFoundError extends Error {
  constructor() {
    super("找不到活動");
    this.name = "EventNotFoundError";
  }
}

export class EventHasAttendanceRecordsError extends Error {
  constructor() {
    super("此活動已有簽到紀錄，請先處理簽到紀錄後再刪除活動");
    this.name = "EventHasAttendanceRecordsError";
  }
}

export class AttendanceNotFoundError extends Error {
  constructor() {
    super("找不到簽到紀錄");
    this.name = "AttendanceNotFoundError";
  }
}

export class AttendanceUserNotFoundError extends Error {
  constructor() {
    super("找不到使用者");
    this.name = "AttendanceUserNotFoundError";
  }
}

export class AttendanceAlreadyExistsError extends Error {
  constructor() {
    super("此使用者已完成此活動簽到");
    this.name = "AttendanceAlreadyExistsError";
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
