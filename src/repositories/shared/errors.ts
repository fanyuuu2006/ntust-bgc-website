export class RepositoryError extends Error {
  constructor(
    public readonly context: string,
    public readonly cause: unknown
  ) {
    super(`[Repository] ${context}`);
    this.name = "RepositoryError";
  }
}

export function throwRepositoryError(context: string, error: unknown): never {
  throw new RepositoryError(context, error);
}
