export class MembershipRegisterKeyNotFoundError extends Error {
  constructor() {
    super("社員註冊序號不存在或無法使用");
    this.name = "MembershipRegisterKeyNotFoundError";
  }
}

export class MembershipRegisterKeyAlreadyUsedError extends Error {
  constructor() {
    super("此社員註冊序號已被使用");
    this.name = "MembershipRegisterKeyAlreadyUsedError";
  }
}

export class MembershipRegisterKeyCannotBeRevokedError extends Error {
  constructor() {
    super("只有尚未使用的社員註冊碼可以撤銷");
    this.name = "MembershipRegisterKeyCannotBeRevokedError";
  }
}

export class MembershipRegisterKeyInactiveError extends Error {
  constructor() {
    super("此社員註冊序號目前無法使用");
    this.name = "MembershipRegisterKeyInactiveError";
  }
}

export class MembershipRegisterKeyNotCurrentYearError extends Error {
  constructor() {
    super("此社員註冊序號不屬於目前學年度");
    this.name = "MembershipRegisterKeyNotCurrentYearError";
  }
}

export class UserAlreadyCurrentMemberError extends Error {
  constructor() {
    super("此使用者已具有當前社員資格");
    this.name = "UserAlreadyCurrentMemberError";
  }
}

export class MembershipAlreadyExistsForAcademicYearError extends Error {
  constructor() {
    super("此使用者在該學年度已有社員資格紀錄，請編輯既有紀錄");
    this.name = "MembershipAlreadyExistsForAcademicYearError";
  }
}


export class CurrentAcademicYearNotFoundError extends Error {
  constructor() {
    super("目前尚未設定當前學年度");
    this.name = "CurrentAcademicYearNotFoundError";
  }
}

export class AcademicYearNotFoundError extends Error {
  constructor() {
    super("找不到指定的學年度");
    this.name = "AcademicYearNotFoundError";
  }
}

export class RegisterKeySecretNotConfiguredError extends Error {
  constructor() {
    super("尚未設定社員註冊序號密鑰");
    this.name = "RegisterKeySecretNotConfiguredError";
  }
}
