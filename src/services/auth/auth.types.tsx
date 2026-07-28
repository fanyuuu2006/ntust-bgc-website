import { z } from "zod";
import { registerSchema } from "./auth.schema";
import { Session } from "@/types/database";

export type RegisterInput = z.infer<typeof registerSchema>;
export type SessionSummary = Pick<
  Session,
  "id" | "created_at" | "last_accessed_at" | "expires_at"
> & {
  is_current: boolean;
};
