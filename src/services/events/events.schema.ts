import { z } from "zod";

const eventDescriptionSchema = z
  .string()
  .trim()
  .max(2000, "活動描述不可超過 2000 字")
  .nullish()
  .transform((value) => value?.trim() || null);

const checkInTimeSchema = z.iso.datetime().nullable().optional();

export const createEventSchema = z
  .object({
    name: z.string().trim().min(1, "活動名稱不可為空").max(100, "活動名稱不可超過 100 字"),
    description: eventDescriptionSchema,
    start_time: z.iso.datetime({ message: "活動開始時間格式不正確" }),
    end_time: z.iso.datetime({ message: "活動結束時間格式不正確" }),
    check_in_opens_at: checkInTimeSchema,
    check_in_closes_at: checkInTimeSchema,
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: "活動結束時間必須晚於開始時間",
    path: ["end_time"],
  });

export const updateEventSchema = z
  .object({
    name: z.string().trim().min(1, "活動名稱不可為空").max(100, "活動名稱不可超過 100 字"),
    description: eventDescriptionSchema.optional(),
    start_time: z.iso.datetime({ message: "活動開始時間格式不正確" }),
    end_time: z.iso.datetime({ message: "活動結束時間格式不正確" }),
    check_in_opens_at: checkInTimeSchema,
    check_in_closes_at: checkInTimeSchema,
  })
  .partial()
  .refine(
    (data) =>
      !data.start_time ||
      !data.end_time ||
      new Date(data.end_time) > new Date(data.start_time),
    { message: "活動結束時間必須晚於開始時間", path: ["end_time"] },
  );

export const attendanceInputSchema = z.object({
  user_id: z.uuid(),
  status: z.enum(["present", "late", "absent"]),
  attended_at: z.iso.datetime().nullable().optional(),
});

export const attendanceUpdateSchema = z.object({
  status: z.enum(["present", "late", "absent"]),
  attended_at: z.iso.datetime().nullable().optional(),
});
