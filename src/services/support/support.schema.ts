import { z } from "zod";

export const publicDisplayNameSchema = z.string()
  .trim()
  .min(1, "請填寫公開暱稱")
  .max(40, "公開暱稱不可超過 40 個字元")
  .refine((name) => !/[\p{Cc}\p{Cf}]/u.test(name), "公開暱稱不可包含控制字元");

export const createSupportRecordSchema = z.object({
  provider: z.string().trim().min(1).max(40).transform((value) => value.toLowerCase()),
  providerTransactionReference: z.string().trim().min(1).max(160)
    .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value)),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
});

export const updateSupportRecordSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("recordConsent"),
    displayName: publicDisplayNameSchema,
    consentMethod: z.string().trim().min(1).max(80),
  }),
  z.object({ action: z.literal("publish") }),
  z.object({ action: z.literal("withdraw") }),
  z.object({ action: z.literal("refund") }),
]);
