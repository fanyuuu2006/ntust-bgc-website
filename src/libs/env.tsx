const LOCAL_SITE_URL = "http://localhost:3000";

export function resolveSiteUrl(
  value: string | undefined,
  environment = process.env.NODE_ENV,
): string {
  const candidate = value?.trim();

  if (!candidate) {
    if (environment === "production") {
      throw new Error("Production requires a valid SITE_URL environment variable");
    }

    return LOCAL_SITE_URL;
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error("SITE_URL must be an absolute HTTP or HTTPS origin");
  }

  const isHttp = url.protocol === "http:" || url.protocol === "https:";
  const isOriginOnly =
    url.pathname === "/" &&
    url.search === "" &&
    url.hash === "" &&
    url.username === "" &&
    url.password === "";

  if (!isHttp || !isOriginOnly) {
    throw new Error("SITE_URL must be an absolute HTTP or HTTPS origin");
  }

  return url.origin;
}

export function getSiteUrl(environment = process.env.NODE_ENV): string {
  return resolveSiteUrl(process.env.SITE_URL, environment);
}

export const SUPABASE_URL = process.env.SUPABASE_URL!;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const NEXT_PUBLIC_TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;
export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY!;
export const REGISTER_KEY_SECRET = process.env.REGISTER_KEY_SECRET;
export const DATABASE_URL = process.env.DATABASE_URL!;
export const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;
