import "server-only";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function configuredSupportManagerId(value = process.env.SUPPORT_MANAGER_USER_ID): string | null {
  const id = value?.trim();
  return id && UUID_PATTERN.test(id) ? id.toLowerCase() : null;
}

export function isSupportManager(
  user: { id: string; closed_at: string | null; email_verified_at: string | null } | null,
  configuredId = configuredSupportManagerId(),
): boolean {
  return Boolean(user && !user.closed_at && user.email_verified_at && configuredId && user.id.toLowerCase() === configuredId);
}
