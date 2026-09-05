import { z } from "zod";

const REAL_NAME_MAX_LENGTH = 50;

const nullableAcademicField = z
  .string()
  .trim()
  .nullish()
  .transform((value) => value?.trim() || null)
  .optional();

const userAcademicFields = {
  student_id: nullableAcademicField,
  school: nullableAcademicField,
  department: nullableAcademicField,
  grade: nullableAcademicField,
};

export const userContactFields = {
  real_name: z.string().trim().max(REAL_NAME_MAX_LENGTH),
  phone: z.string().trim().min(1, { error: "電話不可為空" }),
};

export const createUserProfileSchema = z.object({
  ...userContactFields,
  ...userAcademicFields,
});

export const updateSelfProfileSchema = z
  .object({
    real_name: userContactFields.real_name,
    phone: userContactFields.phone,
    student_id: nullableAcademicField,
    school: nullableAcademicField,
    department: nullableAcademicField,
    grade: nullableAcademicField,
  })
  .strict();

export const updateUserProfileSchema = z.object({
  ...userContactFields,
  ...userAcademicFields,
});

export const updateUserAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "顯示名稱不可為空")
      .max(REAL_NAME_MAX_LENGTH)
      .optional(),

    avatar: z.union([z.url("請輸入有效的圖片網址"), z.null()]).optional(),
  })
  .refine((data) => data.name !== undefined || data.avatar !== undefined, {
    message: "沒有可更新的欄位",
  });
