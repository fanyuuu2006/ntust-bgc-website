export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("此 Email 已經註冊");
    this.name = "EmailAlreadyExistsError";
  }
}
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Email 或密碼錯誤");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super("目前密碼錯誤");
    this.name = "InvalidCurrentPasswordError";
  }
}

export class SessionNotFoundError extends Error {
  constructor() {
    super("找不到指定的 Session");
    this.name = "SessionNotFoundError";
  }
}

export class CannotRevokeCurrentSessionError extends Error {
  constructor() {
    super("無法在此處登出目前使用中的 Session");
    this.name = "CannotRevokeCurrentSessionError";
  }
}