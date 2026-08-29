import { z } from "zod";

export const listOfficerPositionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  search: z
    .preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.string().trim().max(100).optional(),
    )
    .catch(undefined),
});
