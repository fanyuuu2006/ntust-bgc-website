import { z } from "zod";

function normalizeOptionalQueryValue(value: unknown) {
  if (Array.isArray(value)) return undefined;
  if (typeof value !== "string") return value;

  const normalized = value.trim();
  return normalized === "" || normalized.toLowerCase() === "all"
    ? undefined
    : normalized;
}

function optionalQueryString<T extends z.ZodType>(schema: T) {
  return z.preprocess(normalizeOptionalQueryValue, schema.optional());
}

export const membershipRegisterKeySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^\d{3}NTUSTBGC\d{3,}[0-9A-F]{8}$/,
    "社員註冊序號格式不正確",
  );

export const activateMembershipSchema = z.object({
  register_key: membershipRegisterKeySchema,
});

export const listMembershipRegisterKeysQuerySchema = z.object({
  page: optionalQueryString(z.coerce.number().int().min(1)),
  pageSize: optionalQueryString(z.coerce.number().int().min(1).max(100)),
  academic_year_id: optionalQueryString(z.uuid()),
  search: optionalQueryString(z.string().trim().max(100)),
  status: optionalQueryString(
    z.enum(["available", "claimed", "revoked", "expired"]),
  ),
  orderBy: optionalQueryString(
    z.enum(["created_at", "claimed_at", "sequence_number"]),
  ),
  orderDirection: optionalQueryString(z.enum(["asc", "desc"])),
});

export const listAdminMembershipsQuerySchema = z.object({
  page: optionalQueryString(z.coerce.number().int().min(1)),
  pageSize: optionalQueryString(z.coerce.number().int().min(1).max(100)),
  academic_year_id: optionalQueryString(z.uuid()),
  search: optionalQueryString(z.string().trim().max(100)),
  status: optionalQueryString(
    z.enum(["pending", "active", "expired", "suspended", "cancelled"]),
  ),
  orderBy: optionalQueryString(z.enum(["joined_at", "created_at", "status"])),
  orderDirection: optionalQueryString(z.enum(["asc", "desc"])),
});

export const generateMembershipRegisterKeysSchema = z.object({
  academic_year_id: z.uuid("請選擇有效的學年度"),
  count: z.coerce
    .number()
    .int()
    .min(1, "至少產生 1 組序號")
    .max(100, "一次最多產生 100 組序號"),
});

export const createAdminMembershipSchema = z.object({
  user_id: z.uuid(),
  academic_year_id: z.uuid(),
  type: z.enum(["annual", "lifetime"]),
  status: z.enum(["pending", "active", "expired", "suspended", "cancelled"]),
  joined_at: z.string().datetime().nullable().optional(),
});

export const updateAdminMembershipSchema = z.object({
  academic_year_id: z.uuid(),
  type: z.enum(["annual", "lifetime"]),
  status: z.enum(["pending", "active", "expired", "suspended", "cancelled"]),
  joined_at: z.string().datetime().nullable().optional(),
});
