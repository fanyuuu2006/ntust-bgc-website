import "server-only";

export function configuredSupportPaymentUrl(
  value = process.env.SUPPORT_PAYMENT_URL,
): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
