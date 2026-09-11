import { readSingleQueryValue, type QueryParamValue } from "@/libs/query-params";
type AdminUserEmailVerificationFilter = "verified" | "unverified";

const EMAIL_VERIFICATION_FILTERS = ["verified", "unverified"] as const;

export function normalizeAdminUserEmailVerification(
  value: QueryParamValue,
): AdminUserEmailVerificationFilter | undefined {
  const candidate = readSingleQueryValue(value);
  return EMAIL_VERIFICATION_FILTERS.includes(
    candidate as AdminUserEmailVerificationFilter,
  )
    ? (candidate as AdminUserEmailVerificationFilter)
    : undefined;
}
