export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("此 Email 已經註冊");
    this.name = "EmailAlreadyExistsError";
  }
}
