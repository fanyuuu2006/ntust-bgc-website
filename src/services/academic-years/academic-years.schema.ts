import { z } from "zod";
import { isValidDateOnly } from "@/utils/date";

const dateValue = z.string().trim().refine(isValidDateOnly, "日期格式不正確");

export const createAcademicYearSchema = z.object({
  year: z.string().trim().regex(/^\d{3}$/, "學年度請輸入三位數，例如 115"),
  start_date: dateValue,
  end_date: dateValue,
}).refine((value) => value.end_date > value.start_date, { message: "結束日期必須晚於開始日期", path: ["end_date"] });

export const updateAcademicYearSchema = createAcademicYearSchema;
