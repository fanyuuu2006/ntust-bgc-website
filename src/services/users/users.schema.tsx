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

export const realNameSchema = z
  .string()
  .trim()
  .min(1, { error: "請填寫真實姓名" })
  .max(REAL_NAME_MAX_LENGTH, { error: `真實姓名不可超過 ${REAL_NAME_MAX_LENGTH} 個字` });

const phoneSchema = z.string().trim().min(1, { error: "電話不可為空" });

export const registrationProfileFields = {
  real_name: realNameSchema,
  phone: phoneSchema,
};

const selfEditableProfileFields = {
  phone: phoneSchema,
  ...userAcademicFields,
};

const adminEditableProfileFields = {
  ...registrationProfileFields,
  ...userAcademicFields,
};

export const createUserProfileSchema = z.object({
  ...adminEditableProfileFields,
});

export const updateSelfProfileSchema = z
  .object(selfEditableProfileFields)
  .strict();

export const updateUserProfileSchema = z.object(adminEditableProfileFields);

export const updateUserAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "顯示名稱不可為空")
      .max(REAL_NAME_MAX_LENGTH)
      .optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined, {
    message: "沒有可更新的欄位",
  });

export const adminUserPickerSearchSchema = z.object({
  search: z.string().trim().min(1, "請輸入搜尋條件").max(100),
});
