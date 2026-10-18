import { z } from "zod";
import { descriptionFields, validateDescription, canonicalizeDescription } from "@/libs/rich-content/description";

const checkInTimeSchema = z.iso.datetime().nullable().optional();

export const createEventSchema = z
  .object({
    name: z.string().trim().min(1, "活動名稱不可為空").max(100, "活動名稱不可超過 100 字"),
    ...descriptionFields,
    start_time: z.iso.datetime({ message: "活動開始時間格式不正確" }),
    end_time: z.iso.datetime({ message: "活動結束時間格式不正確" }),
    check_in_opens_at: checkInTimeSchema,
    check_in_closes_at: checkInTimeSchema,
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: "活動結束時間必須晚於開始時間",
    path: ["end_time"],
  }).superRefine(validateDescription).transform(canonicalizeDescription);

export const updateEventSchema = z
  .object({
    name: z.string().trim().min(1, "活動名稱不可為空").max(100, "活動名稱不可超過 100 字"),
    ...descriptionFields,
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
  ).superRefine(validateDescription).transform(canonicalizeDescription);

export const attendanceInputSchema = z.object({
  user_id: z.uuid(),
  status: z.enum(["present", "late", "absent"]),
  attended_at: z.iso.datetime().nullable().optional(),
});

export const attendanceUpdateSchema = z.object({
  status: z.enum(["present", "late", "absent"]),
  attended_at: z.iso.datetime().nullable().optional(),
});

const bulkAttendanceRecordsSchema = z
    .array(
      z.object({
        id: z.number().int().positive(),
        expected_status: z.enum(["present", "late", "absent"]),
        expected_attended_at: z.iso.datetime().nullable(),
      }),
    )
    .min(1, "請至少選取一筆簽到紀錄")
    .max(100, "一次最多更新 100 筆簽到紀錄")
    .refine(
      (records) => new Set(records.map(({ id }) => id)).size === records.length,
      { message: "簽到紀錄 ID 不可重複" },
    );

export const bulkAttendanceUpdateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set-status"),
    status: z.enum(["present", "late", "absent"]),
    records: bulkAttendanceRecordsSchema,
  }),
  z.object({
    action: z.literal("delete"),
    records: bulkAttendanceRecordsSchema,
  }),
]);
