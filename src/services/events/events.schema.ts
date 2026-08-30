import { z } from "zod";

const eventDescriptionSchema = z
  .string()
  .trim()
  .max(2000, "活動說明過長")
  .nullish()
  .transform((value) => value?.trim() || null);

export const createEventSchema = z
  .object({
    name: z.string().trim().min(1, "請輸入活動名稱").max(100, "活動名稱過長"),
    description: eventDescriptionSchema,
    start_time: z.iso.datetime({ message: "開始時間格式不正確" }),
    end_time: z.iso.datetime({ message: "結束時間格式不正確" }),
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: "結束時間必須晚於開始時間",
    path: ["end_time"],
  });

export const updateEventSchema = z
  .object({
    name: z.string().trim().min(1, "請輸入活動名稱").max(100, "活動名稱過長"),
    description: eventDescriptionSchema.optional(),
    start_time: z.iso.datetime({ message: "開始時間格式不正確" }),
    end_time: z.iso.datetime({ message: "結束時間格式不正確" }),
  })
  .partial()
  .refine(
    (data) =>
      !data.start_time ||
      !data.end_time ||
      new Date(data.end_time) > new Date(data.start_time),
    { message: "結束時間必須晚於開始時間", path: ["end_time"] },
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
