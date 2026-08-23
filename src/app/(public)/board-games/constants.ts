import type { BoardGameStatus } from "@/types/database";
import type { FindManyBoardGamesOptions } from "@/repositories/board-games.repository";

export const BASE_PATH = "/board-games";

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [12, 24, 36] as const;

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
  { label: string; toneClass: string; dotClass: string; description: string }
> = {
  available: {
    label: "可借用",
    toneClass:
      "border-(--game-green) bg-green-50 text-green-700",
    dotClass: "bg-(--game-green)",
    description: "目前可提出借用申請",
  },
  borrowed: {
    label: "借用中",
    toneClass: "border-(--game-blue) bg-blue-50 text-blue-700",
    dotClass: "bg-(--game-blue)",
    description: "已被借出，暫時無法借用",
  },
  maintenance: {
    label: "維護中",
    toneClass: "border-(--game-yellow) bg-yellow-50 text-yellow-700",
    dotClass: "bg-(--game-yellow)",
    description: "整理或修復中",
  },
  lost: {
    label: "遺失",
    toneClass: "border-(--game-red) bg-red-50 text-red-700",
    dotClass: "bg-(--game-red)",
    description: "目前找不到實體遊戲",
  },
  damaged: {
    label: "損壞",
    toneClass: "border-(--game-red) bg-red-50 text-red-700",
    dotClass: "bg-(--game-red)",
    description: "配件或內容物有損壞",
  },
  retired: {
    label: "已除役",
    toneClass: "border-(--border) bg-(--secondary-background) text-(--muted)",
    dotClass: "bg-(--muted)",
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
