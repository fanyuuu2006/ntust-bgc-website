import { z } from "zod";
import { descriptionFields, validateDescription, canonicalizeDescription } from "@/libs/rich-content/description";
import { readSingleQueryValue } from "@/libs/query-params";

export const boardGameStatusSchema = z.enum([
  "available",
  "borrowed",
  "maintenance",
  "lost",
  "damaged",
  "retired",
]);

export const borrowingStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "borrowed",
  "returned",
  "cancelled",
]);

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `長度不可超過 ${max} 字`)
    .nullish()
    .transform((value) => value?.trim() || null);

const optionalQueryField = <T extends z.ZodType>(schema: T) =>
  z.preprocess(readSingleQueryValue, schema.optional()).catch(undefined);

export const boardGameMasterDataSchema = z.object({
  name: z.string().trim().min(1, "請輸入名稱").max(100),
  description: nullableText(500).optional(),
});

const boardGameInputSchema = z.object({
  name: z.string().trim().min(1, "請輸入名稱").max(100, "名稱不可超過 100 字"),
  inventory_number: z.number().int().min(1, "請輸入有效的社產編號"),
  category_id: z.uuid("請選擇分類"),
  location_id: z.uuid("請選擇位置"),
  ...descriptionFields,
  status: boardGameStatusSchema.default("available"),
}).strict();

export const createBoardGameSchema = boardGameInputSchema.superRefine(validateDescription).transform(canonicalizeDescription);
export const updateBoardGameSchema = boardGameInputSchema.partial().superRefine(validateDescription).transform(canonicalizeDescription);

const bulkBoardGameRecordSchema = z.object({ id: z.uuid(), expected_updated_at: z.string().datetime() });
export const bulkUpdateBoardGamesSchema = z.object({
  action: z.enum(["set-category", "set-location"]),
  target_id: z.uuid("請選擇有效的種類或位置"),
  records: z.array(bulkBoardGameRecordSchema).min(1).max(100).refine(
    (records) => new Set(records.map((record) => record.id)).size === records.length,
    { message: "桌遊 ID 不可重複" },
  ),
}).strict();

export const listBoardGamesQuerySchema = z.object({
  page: optionalQueryField(z.coerce.number().int().min(1)),
  pageSize: optionalQueryField(z.coerce.number().int().min(1).max(100)),
  search: optionalQueryField(z.string().trim().max(100)),
  status: optionalQueryField(boardGameStatusSchema),
  category_id: optionalQueryField(z.uuid()),
  location_id: optionalQueryField(z.uuid()),
  orderBy: optionalQueryField(
    z.enum(["name", "created_at", "updated_at", "inventory_number"]),
  ),
  orderDirection: optionalQueryField(z.enum(["asc", "desc"])),
});

export const listAdminBoardGamesQuerySchema = z.object({
  page: optionalQueryField(z.coerce.number().int().min(1)),
  pageSize: optionalQueryField(z.coerce.number().int().min(1).max(100)),
  search: optionalQueryField(z.string().trim().max(100)),
  status: optionalQueryField(boardGameStatusSchema),
  category: optionalQueryField(z.uuid()),
  location: optionalQueryField(z.uuid()),
  orderBy: optionalQueryField(
    z.enum(["name", "created_at", "updated_at", "inventory_number"]),
  ),
  orderDirection: optionalQueryField(z.enum(["asc", "desc"])),
});

export const listBorrowingsQuerySchema = z.object({
  overdue: optionalQueryField(z.literal("true")),
  page: optionalQueryField(z.coerce.number().int().min(1)),
  pageSize: optionalQueryField(z.coerce.number().int().min(1).max(100)),
  status: optionalQueryField(borrowingStatusSchema),
  board_game_id: optionalQueryField(z.uuid()),
  user_id: optionalQueryField(z.uuid()),
  search: optionalQueryField(z.string().trim().max(100)),
  orderBy: optionalQueryField(
    z.enum(["created_at", "borrowed_at", "due_at", "returned_at"]),
  ),
  orderDirection: optionalQueryField(z.enum(["asc", "desc"])),
});

export const createBorrowingRequestSchema = z.object({
  board_game_id: z.uuid("請選擇要借用的桌遊"),
  due_at: z.iso.datetime({ local: false }).optional(),
});

export const updateBorrowingActionSchema = z.object({
  action: z.enum(["approve", "reject", "checkout", "return"]),
  due_at: z.iso.datetime({ local: false }).optional(),
}).strict();

const bulkBorrowingRecordSchema = z.object({
  id: z.number().int().positive(),
  expected_status: z.enum(["pending", "approved", "borrowed"]),
  expected_board_game_id: z.uuid(),
  expected_board_game_status: boardGameStatusSchema,
}).strict();

export const bulkUpdateBorrowingsSchema = z.object({
  action: z.enum(["approve", "reject", "borrow", "return"]),
  due_at: z.iso.datetime({ local: false }).optional(),
  records: z.array(bulkBorrowingRecordSchema).min(1).max(100).refine(
    (records) => new Set(records.map((record) => record.id)).size === records.length,
    { message: "借用紀錄 ID 不可重複" },
  ),
}).strict().superRefine((data, context) => {
  const requiredStatus = data.action === "borrow"
    ? "approved"
    : data.action === "return"
      ? "borrowed"
      : "pending";
  data.records.forEach((record, index) => {
    if (record.expected_status !== requiredStatus) {
      context.addIssue({
        code: "custom",
        path: ["records", index, "expected_status"],
        message: `此批次操作只接受 ${requiredStatus} 狀態`,
      });
    }
    if (data.action === "return" && record.expected_board_game_status !== "borrowed") {
      context.addIssue({
        code: "custom",
        path: ["records", index, "expected_board_game_status"],
        message: "批次歸還只接受借出中的桌遊",
      });
    }
    if (data.action === "borrow" && record.expected_board_game_status !== "available") {
      context.addIssue({
        code: "custom",
        path: ["records", index, "expected_board_game_status"],
        message: "批次確認借出只接受可借用的桌遊",
      });
    }
  });
  if (data.action === "borrow") {
    const dueAt = data.due_at ? new Date(data.due_at) : null;
    if (!dueAt || Number.isNaN(dueAt.getTime()) || dueAt <= new Date()) {
      context.addIssue({
        code: "custom",
        path: ["due_at"],
        message: "預計歸還時間必須晚於目前時間",
      });
    }
  } else if (data.due_at !== undefined) {
    context.addIssue({
      code: "custom",
      path: ["due_at"],
      message: "此批次操作不接受預計歸還時間",
    });
  }
});

export const updateBorrowingDueDateSchema = z.object({
  due_at: z.iso.datetime({ local: false }),
}).strict();
