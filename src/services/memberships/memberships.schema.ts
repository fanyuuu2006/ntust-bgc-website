import { z } from "zod";
import { readSingleQueryValue } from "@/libs/query-params";

function normalizeOptionalQueryValue(value: unknown) {
  const normalized = readSingleQueryValue(
    value as string | string[] | undefined,
  );
  return normalized?.toLowerCase() === "all"
    ? undefined
    : normalized;
}

function optionalQueryString<T extends z.ZodType>(schema: T) {
  return z
    .preprocess(normalizeOptionalQueryValue, schema.optional())
    .catch(undefined);
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

export const listMemberMembershipRecordsQuerySchema = z.object({
  page: optionalQueryString(z.coerce.number().int().min(1)),
  pageSize: optionalQueryString(z.coerce.number().int().min(1).max(100)),
  search: optionalQueryString(z.string().trim().max(40)),
  type: optionalQueryString(z.enum(["annual", "lifetime"])),
  status: optionalQueryString(
    z.enum(["pending", "active", "expired", "suspended", "cancelled"]),
  ),
  orderBy: optionalQueryString(z.literal("academic_year")),
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

export const bulkRevokeMembershipRegisterKeysSchema = z.object({
  action: z.literal("revoke"),
  ids: z
    .array(z.uuid("社員註冊序號 ID 格式不正確"))
    .min(1, "請至少選取一筆社員註冊序號")
    .max(100, "一次最多撤銷 100 筆社員註冊序號")
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "社員註冊序號 ID 不可重複",
    }),
});

export const createAdminMembershipSchema = z.object({
  user_id: z.uuid(),
  academic_year_id: z.uuid(),
  status: z.enum(["pending", "active", "expired", "suspended", "cancelled"]),
  joined_at: z.string().datetime().nullable().optional(),
});

export const updateAdminMembershipSchema = z.object({
  academic_year_id: z.uuid(),
  status: z.enum(["pending", "active", "expired", "suspended", "cancelled"]),
  joined_at: z.string().datetime().nullable().optional(),
});

const bulkMembershipRecordSchema = z.object({
  id: z.uuid(),
  expected_status: z.enum([
    "pending",
    "active",
    "expired",
    "suspended",
    "cancelled",
  ]),
  expected_academic_year_id: z.uuid(),
  expected_updated_at: z.string().datetime(),
});

export const bulkUpdateMembershipStatusSchema = z.object({
  action: z.literal("set-status"),
  status: z.enum([
    "pending",
    "active",
    "expired",
    "suspended",
    "cancelled",
  ]),
  records: z
    .array(bulkMembershipRecordSchema)
    .min(1, "請至少選取一筆社員資格")
    .max(100, "單次最多更新 100 筆社員資格")
    .refine(
      (records) => new Set(records.map((record) => record.id)).size === records.length,
      { message: "社員資格 ID 不可重複" },
    )
    .refine(
      (records) =>
        new Set(records.map((record) => record.expected_academic_year_id)).size === 1,
      { message: "批次更新的社員資格必須屬於同一學年度" },
    ),
});
