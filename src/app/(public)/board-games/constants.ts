import type { BoardGameStatus } from "@/types/database";

export const BASE_PATH = "/board-games";

export const DEFAULT_ORDER_BY = "created_at";
export const DEFAULT_ORDER_DIRECTION = "desc";
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

export const SORT_OPTIONS = [
  {
    key: "created_at:desc",
    label: "最新加入",
    orderBy: "created_at",
    orderDirection: "desc",
  },
  {
    key: "inventory_number:asc",
    label: "社產編號",
    orderBy: "inventory_number",
    orderDirection: "asc",
  },
  {
    key: "name:asc",
    label: "名稱 A-Z",
    orderBy: "name",
    orderDirection: "asc",
  },
  {
    key: "updated_at:desc",
    label: "最近更新",
    orderBy: "updated_at",
    orderDirection: "desc",
  },
] as const;
