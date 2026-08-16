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
  { label: string; dotClass: string }
> = {
  available: { label: "可借用", dotClass: "bg-(--game-green)" },
  borrowed: { label: "借用中", dotClass: "bg-(--game-blue)" },
  maintenance: { label: "維護中", dotClass: "bg-(--game-yellow)" },
  lost: { label: "遺失", dotClass: "bg-(--game-red)" },
  damaged: { label: "損壞", dotClass: "bg-(--game-red)" },
  retired: { label: "已除役", dotClass: "bg-(--muted)" },
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
