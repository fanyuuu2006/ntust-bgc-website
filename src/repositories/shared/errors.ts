import type { OperationContext } from "@/libs/observability/operation-context";

export class RepositoryError extends Error {
  constructor(
    public readonly context: string,
    public readonly cause: unknown,
    public readonly operationContext?: OperationContext,
  ) {
    super(`[Repository] ${context}`);
    this.name = "RepositoryError";
  }
}

export function throwRepositoryError(context: string, error: unknown, operationContext?: OperationContext): never {
  throw new RepositoryError(context, error, operationContext);
}
