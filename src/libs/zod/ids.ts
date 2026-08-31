import { z } from "zod";

/** Parses a PostgREST bigint identity route parameter without losing precision. */
export const positiveIntegerIdSchema = z
  .string()
  .regex(/^\d+$/, "ID 必須是正整數")
  .transform((value) => Number(value))
  .refine(
    (value) => Number.isSafeInteger(value) && value > 0,
    "ID 必須是有效的正整數",
  );

export function parsePositiveIntegerId(value: string): number {
  return positiveIntegerIdSchema.parse(value);
}
