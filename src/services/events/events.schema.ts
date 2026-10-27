import { z } from "zod";
import { descriptionFields, validateDescription, canonicalizeDescription } from "@/libs/rich-content/description";
import { CALENDAR_COLOR_PATTERN } from "@/utils/calendar-color";

const checkInTimeSchema = z.iso.datetime().nullable().optional();
const calendarColorSchema = z.string().regex(CALENDAR_COLOR_PATTERN, "請輸入有效的六位十六進位色碼").nullable().optional();

export const createEventSchema = z
  .object({
    name: z.string().trim().min(1, "活動名稱不可為空").max(100, "活動名稱不可超過 100 字"),
    ...descriptionFields,
    start_time: z.iso.datetime({ message: "活動開始時間格式不正確" }),
    end_time: z.iso.datetime({ message: "活動結束時間格式不正確" }),
    check_in_opens_at: checkInTimeSchema,
    check_in_closes_at: checkInTimeSchema,
    publication_status: z.enum(["draft", "published"]).optional(),
    calendar_color: calendarColorSchema,
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
    publication_status: z.enum(["draft", "published"]).optional(),
    cancelled_at: z.never().optional(),
    calendar_color: calendarColorSchema,
  })
  .partial()
  .refine(
    (data) =>
      !data.start_time ||
      !data.end_time ||
      new Date(data.end_time) > new Date(data.start_time),
    { message: "活動結束時間必須晚於開始時間", path: ["end_time"] },
  ).superRefine(validateDescription).transform(canonicalizeDescription);

export const eventActionSchema = z
  .object({ action: z.enum(["cancel", "restore"]) })
  .strict();

export const publicEventsQuerySchema = z.object({
  from: z.iso.datetime({ offset: true, message: "開始時間格式不正確" }),
  to: z.iso.datetime({ offset: true, message: "結束時間格式不正確" }),
}).refine((data) => new Date(data.from) < new Date(data.to), {
  message: "查詢開始時間必須早於結束時間",
  path: ["to"],
}).refine((data) => new Date(data.to).getTime() - new Date(data.from).getTime() <= 366 * 24 * 60 * 60 * 1000, {
  message: "查詢區間不可超過 366 天",
  path: ["to"],
});

export const publicEventIdSchema = z.uuid();

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
