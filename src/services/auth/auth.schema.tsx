import { z } from "zod";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const NAME_MAX_LENGTH = 50;

const PASSWORD_RULES: { regex: RegExp; message: string }[] = [
  { regex: /[A-Z]/, message: "密碼至少需要包含一個大寫英文字母" },
  { regex: /[a-z]/, message: "密碼至少需要包含一個小寫英文字母" },
  { regex: /[0-9]/, message: "密碼至少需要包含一個數字" },
  { regex: /[^A-Za-z0-9]/, message: "密碼至少需要包含一個特殊符號" },
];

function applyPasswordRules(password: string, ctx: z.RefinementCtx) {
  for (const { regex, message } of PASSWORD_RULES) {
    if (!regex.test(password)) {
      ctx.addIssue({ code: "custom", message });
    }
  }
}

export const registerSchema = z
  .object({
    email: z.email({ error: "Email 格式不正確" }).trim().toLowerCase(),

    name: z
      .string()
      .trim()
      .min(1, { error: "姓名不可為空" })
      .max(NAME_MAX_LENGTH, { error: `姓名不可超過 ${NAME_MAX_LENGTH} 個字` }),

    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, {
        error: `密碼至少需要 ${PASSWORD_MIN_LENGTH} 個字元`,
      })
      .max(PASSWORD_MAX_LENGTH, {
        error: `密碼不可超過 ${PASSWORD_MAX_LENGTH} 個字元`,
      })
      .superRefine(applyPasswordRules),
  })
  .refine((data) => data.password !== data.email, {
    message: "密碼不可與 Email 相同",
    path: ["password"],
  });

export const loginSchema = z.object({
  email: z.email({ error: "Email 格式不正確" }).trim().toLowerCase(),
  password: z.string().min(1, { error: "請輸入密碼" }),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "請輸入目前密碼" }),

    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, {
        error: `新密碼至少需要 ${PASSWORD_MIN_LENGTH} 個字元`,
      })
      .max(PASSWORD_MAX_LENGTH, {
        error: `新密碼不可超過 ${PASSWORD_MAX_LENGTH} 個字元`,
      })
      .superRefine(applyPasswordRules),

    confirmPassword: z.string().min(1, { error: "請再次輸入新密碼" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "兩次輸入的新密碼不一致",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "新密碼不可與目前密碼相同",
    path: ["newPassword"],
  });
