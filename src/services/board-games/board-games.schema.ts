import { z } from "zod";
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

const optionalImage = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    return value;
  },
  z.union([z.url("請輸入有效的圖片網址"), z.null()]).optional(),
);

export const createBoardGameSchema = z.object({
  name: z.string().trim().min(1, "請輸入名稱").max(100, "名稱不可超過 100 字"),
  inventory_number: z.number().int().min(1, "請輸入有效的社產編號"),
  category_id: z.uuid("請選擇分類"),
  location_id: z.uuid("請選擇位置"),
  description: nullableText(2000),
  image: optionalImage,
  status: boardGameStatusSchema.default("available"),
});

export const updateBoardGameSchema = createBoardGameSchema.partial();

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

export const updateBorrowingDueDateSchema = z.object({
  due_at: z.iso.datetime({ local: false }),
}).strict();
