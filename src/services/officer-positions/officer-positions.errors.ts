export class OfficerInputError extends Error {
  constructor(message = "請完整填寫使用者、學年度與職位名稱") {
    super(message);
    this.name = "OfficerInputError";
  }
}

export class OfficerUserNotFoundError extends Error {
  constructor() {
    super("找不到此使用者");
    this.name = "OfficerUserNotFoundError";
  }
}

export class OfficerAcademicYearNotFoundError extends Error {
  constructor() {
    super("找不到此學年度");
    this.name = "OfficerAcademicYearNotFoundError";
  }
}

export class OfficerPositionNotFoundError extends Error {
  constructor() {
    super("找不到此幹部職位");
    this.name = "OfficerPositionNotFoundError";
  }
}
