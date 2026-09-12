export type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string[] | undefined>;
  errorId?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: Record<string, string[] | undefined>,
    public readonly errorId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
