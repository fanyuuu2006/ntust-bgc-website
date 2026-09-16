export class AvatarImageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarImageInputError";
  }
}

export class AvatarMutationConflictError extends Error {
  constructor() {
    super("頭像已在其他操作中變更，請重新整理後再試");
    this.name = "AvatarMutationConflictError";
  }
}
