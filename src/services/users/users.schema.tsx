import { emptyStringToUndefined } from "@/libs/zod/helpers";
import { z } from "zod";

const NAME_MAX_LENGTH = 50;
const AVATAR_MAX_LENGTH = 500;

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

export const updateUserProfileSchema = z.object({
  ...userProfileFields,
});

export const updateUserAccountSchema = z
  .object({
    name: emptyStringToUndefined(
      z.string().trim().min(1, "顯示名稱不可為空").max(NAME_MAX_LENGTH),
    ),

    avatar: emptyStringToUndefined(
      z.url("請輸入有效的圖片網址").max(AVATAR_MAX_LENGTH),
    ),
  })
  .refine((data) => data.name !== undefined || data.avatar !== undefined, {
    message: "沒有可更新的欄位",
  });
