type VerificationMetadata = { expires_at: string; consumed_at: string | null };

export function getVerificationTokenStatus(
  metadata: VerificationMetadata,
  now = new Date(),
): "active" | "expired" | "consumed" {
  if (metadata.consumed_at) return "consumed";
  return new Date(metadata.expires_at).getTime() <= now.getTime() ? "expired" : "active";
}
