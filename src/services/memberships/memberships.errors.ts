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
    super("你已具備本學年度社員資格");
    this.name = "UserAlreadyCurrentMemberError";
  }
}

export class UserAlreadyLifetimeMemberError extends Error {
  constructor() {
    super("你已具備永久社員資格");
    this.name = "UserAlreadyLifetimeMemberError";
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
