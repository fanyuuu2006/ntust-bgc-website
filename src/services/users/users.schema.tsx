import { z } from "zod";

export const updateUserProfileSchema = z.object({
  real_name: z.string().min(2, "姓名至少需要兩個字").optional(),

  phone: z
    .string()
    .regex(/^09\d{8}$/, "手機格式錯誤")
    .optional(),

  student_id: z.string().min(5, "學號格式錯誤").optional(),

  school: z.string().optional(),

  department: z.string().optional(),

  grade: z.string().optional(),
});
