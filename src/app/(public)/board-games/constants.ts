import type { BoardGameStatus } from "@/types/database";
import type { FindManyBoardGamesOptions } from "@/repositories/board-games.repository";

export const BASE_PATH = "/board-games";

export const DEFAULT_PAGE_SIZE = 24;
export const PAGE_SIZE_OPTIONS = [24, 36, 48, 60] as const;

export function normalizePageSize(value?: string) {
  const pageSize = Number(value);
  return PAGE_SIZE_OPTIONS.includes(
    pageSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? pageSize
    : DEFAULT_PAGE_SIZE;
}

export const ALLOWED_STATUSES: BoardGameStatus[] = [
  "available",
  "borrowed",
  "maintenance",
  "lost",
  "damaged",
  "retired",
];

export const STATUS_META: Record<
  BoardGameStatus,
  { label: string; description: string }
> = {
  available: {
    label: "可借用",
    description: "目前可提出借用申請",
  },
  borrowed: {
    label: "借出中",
    description: "已被借出，暫時無法借用",
  },
  maintenance: {
    label: "維護中",
    description: "整理或修復中",
  },
  lost: {
    label: "遺失",
    description: "目前找不到實體遊戲",
  },
  damaged: {
    label: "損壞",
    description: "配件或內容物有損壞",
  },
  retired: {
    label: "已除役",
    description: "不再開放一般借用",
  },
};

export const SORT_OPTIONS: {
  key: string;
  orderBy: FindManyBoardGamesOptions["orderBy"];
  orderDirection: "asc" | "desc";
  label: string;
}[] = [
  {
    key: "created_at:desc",
    orderBy: "created_at",
    orderDirection: "desc",
    label: "最新加入",
  },
  {
    key: "created_at:asc",
    orderBy: "created_at",
    orderDirection: "asc",
    label: "最早加入",
  },
  {
    key: "name:asc",
    orderBy: "name",
    orderDirection: "asc",
    label: "名稱 A-Z",
  },
  {
    key: "name:desc",
    orderBy: "name",
    orderDirection: "desc",
    label: "名稱 Z-A",
  },
  {
    key: "inventory_number:asc",
    orderBy: "inventory_number",
    orderDirection: "asc",
    label: "編號小到大",
  },
  {
    key: "inventory_number:desc",
    orderBy: "inventory_number",
    orderDirection: "desc",
    label: "編號大到小",
  },
  {
    key: "updated_at:desc",
    orderBy: "updated_at",
    orderDirection: "desc",
    label: "最近更新",
  },
];
