import "server-only";

import { z } from "zod";

export const boardGameStatusSchema = z.enum([
  "available",
  "borrowed",
  "maintenance",
  "lost",
  "damaged",
  "retired",
]);

const optionalText = (max: number) =>
  z.string().trim().max(max, `長度不可超過 ${max} 字`).optional();

export const createBoardGameSchema = z.object({
  name: z.string().trim().min(1, "請輸入名稱").max(100, "名稱不可超過 100 字"),
  inventory_number: z.number().int().min(1, "請輸入有效的社產編號"),
  category_id: z.uuid("請選擇分類"),
  location_id: z.uuid("請選擇位置"),
  description: optionalText(2000),
  image: z.union([z.url("請輸入有效的圖片網址"), z.null()]).optional(),
  status: boardGameStatusSchema.optional(),
});

export const updateBoardGameSchema = createBoardGameSchema.partial();

export const listBoardGamesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
  status: boardGameStatusSchema.optional(),
  category_id: z.uuid().optional(),
  location_id: z.uuid().optional(),
  orderBy: z
    .enum(["name", "created_at", "updated_at", "inventory_number"])
    .optional(),
  orderDirection: z.enum(["asc", "desc"]).optional(),
});
