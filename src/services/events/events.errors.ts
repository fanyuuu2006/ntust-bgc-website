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

export class EventCheckInWindowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventCheckInWindowError";
  }
}

export class EventCancelledError extends Error {
  constructor() {
    super("活動已取消，無法新增簽到");
    this.name = "EventCancelledError";
  }
}

export class EventAlreadyCancelledError extends Error {
  constructor() {
    super("活動已經取消");
    this.name = "EventAlreadyCancelledError";
  }
}

export class EventNotCancelledError extends Error {
  constructor() {
    super("活動目前不是取消狀態");
    this.name = "EventNotCancelledError";
  }
}

export class AttendanceNotFoundError extends Error {
  constructor() {
    super("找不到簽到紀錄");
    this.name = "AttendanceNotFoundError";
  }
}

export class AttendanceBatchConflictError extends Error {
  constructor() {
    super("部分簽到紀錄已變更、不存在或不屬於此活動，未更新任何紀錄");
    this.name = "AttendanceBatchConflictError";
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
