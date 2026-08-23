import { z } from "zod";

const dateValue = z.string().trim().min(1, "請選擇日期").refine((value) => !Number.isNaN(new Date(value).getTime()), "日期格式不正確");

export const createAcademicYearSchema = z.object({
  year: z.string().trim().regex(/^\d{3}$/, "學年度請輸入三位數，例如 115"),
  start_date: dateValue,
  end_date: dateValue,
}).refine((value) => new Date(value.end_date) > new Date(value.start_date), { message: "結束日期必須晚於開始日期", path: ["end_date"] });

export const updateAcademicYearSchema = createAcademicYearSchema;
