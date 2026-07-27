export type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string[] | undefined>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
