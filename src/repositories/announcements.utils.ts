type PostgrestErrorLike = {
  code?: unknown;
};

export function isPostgrestRangeNotSatisfiable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as PostgrestErrorLike).code === "PGRST103"
  );
}
