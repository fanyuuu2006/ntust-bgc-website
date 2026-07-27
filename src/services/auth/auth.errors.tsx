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
