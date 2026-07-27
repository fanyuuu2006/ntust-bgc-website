import { z } from "zod";
import { registerSchema } from "./auth.schema";

export type RegisterInput = z.infer<typeof registerSchema>;
