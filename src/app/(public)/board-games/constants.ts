import type { BoardGameStatus } from "@/types/database";
import type { FindManyBoardGamesOptions } from "@/repositories/board-games.repository";

export const BASE_PATH = "/board-games";

export const DEFAULT_ORDER_BY: FindManyBoardGamesOptions["orderBy"] =
  "created_at";
export const DEFAULT_ORDER_DIRECTION: "asc" | "desc" = "desc";
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

export const ORDER_BY_OPTIONS: {
  value: FindManyBoardGamesOptions["orderBy"];
  label: string;
}[] = [
  { value: "created_at", label: "加入時間" },
  { value: "inventory_number", label: "社產編號" },
  { value: "name", label: "名稱" },
  { value: "updated_at", label: "更新時間" },
];
