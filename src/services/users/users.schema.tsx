import { z } from "zod";

const userProfileFields = {
  real_name: z.string().min(1, "姓名不能為空"),
  phone: z.string().optional(),
  student_id: z.string().optional(),
  school: z.string().optional(),
  department: z.string().optional(),
  grade: z.string().optional(),
};

export const createUserProfileSchema = z.object({
  ...userProfileFields,
});

export const updateUserProfileSchema = z
  .object({
    ...userProfileFields,
  })
  .partial();
