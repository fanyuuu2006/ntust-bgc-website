export function getSafeReturnPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) {
    return fallback;
  }

  return value;
}

const LOGIN_TRANSITION_PATHS = new Set([
  "/login",
  "/register",
  "/verify-email",
  "/verify-email/pending",
  "/api/auth/email-verification/confirm",
]);

export function getSafeLoginReturnPath(
  value: string | null | undefined,
  fallback: `/${string}` = "/dashboard",
): `/${string}` {
  const safePath = getSafeReturnPath(value, fallback);

  try {
    const pathname = decodeURIComponent(
      new URL(safePath, "https://return.invalid").pathname,
    ).replace(/\/+$/, "") || "/";

    return LOGIN_TRANSITION_PATHS.has(pathname)
      ? fallback
      : safePath as `/${string}`;
  } catch {
    return fallback;
  }
}
