import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "@/repositories/shared/pagination";
import { buildIlikeSearch } from "@/repositories/shared/search";
import { OrderOptions, PaginationQuery } from "@/repositories/shared/types";
import { BoardGame, BoardGameStatus } from "@/types/database";

export type CreateBoardGameInput = Pick<
  BoardGame,
  "name" | "category_id" | "location_id" | "inventory_number"
> &
  Partial<Pick<BoardGame, "description" | "image" | "status">>;

export type UpdateBoardGameInput = Partial<
  Pick<
    BoardGame,
    | "name"
    | "description"
    | "image"
    | "category_id"
    | "location_id"
    | "status"
    | "inventory_number"
  >
>;

export type FindManyBoardGamesOptions = PaginationQuery &
  OrderOptions<"name" | "created_at" | "status"> & {
    search?: string;
    status?: BoardGameStatus | BoardGameStatus[];
    category_id?: string;
    location_id?: string;
  };

export const boardGamesRepository = {
  findMany: async (options: FindManyBoardGamesOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      page: options.page,
      pageSize: options.pageSize,
    });
    const orderBy = options.orderBy ?? "created_at";
    const orderDirection = options.orderDirection ?? "desc";

    let query = supabase.from("board_games").select("*", { count: "exact" });

    const keyword = options.search?.trim();
    if (keyword) {
      query = query.or(buildIlikeSearch(["name", "inventory_number"], keyword));
    }

    if (options.status) {
      query = Array.isArray(options.status)
        ? query.in("status", options.status)
        : query.eq("status", options.status);
    }

    if (options.category_id) {
      query = query.eq("category_id", options.category_id);
    }

    if (options.location_id) {
      query = query.eq("location_id", options.location_id);
    }

    query = query
      .order(orderBy, { ascending: orderDirection === "asc" })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throwRepositoryError("取得桌遊列表失敗", error);

    return buildPaginationResult<BoardGame>(data ?? [], count, page, pageSize);
  },

  findById: async (id: string): Promise<BoardGame | null> => {
    const { data, error } = await supabase
      .from("board_games")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throwRepositoryError("依 ID 尋找桌遊失敗", error);
    return data;
  },

  findByInventoryNumber: async (
    inventoryNumber: string,
  ): Promise<BoardGame | null> => {
    const { data, error } = await supabase
      .from("board_games")
      .select("*")
      .eq("inventory_number", inventoryNumber)
      .maybeSingle();
    if (error) throwRepositoryError("依編號尋找桌遊失敗", error);
    return data;
  },

  findManyByIds: async (ids: string[]): Promise<BoardGame[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("board_games")
      .select("*")
      .in("id", ids);
    if (error) throwRepositoryError("依 ID 批次尋找桌遊失敗", error);
    return data ?? [];
  },

  existsByInventoryNumber: async (
    inventoryNumber: string,
    excludeId?: string,
  ): Promise<boolean> => {
    let query = supabase
      .from("board_games")
      .select("id", { count: "exact", head: true })
      .eq("inventory_number", inventoryNumber);
    if (excludeId) query = query.neq("id", excludeId);

    const { count, error } = await query;
    if (error) throwRepositoryError("檢查館藏編號是否存在失敗", error);
    return (count ?? 0) > 0;
  },

  countByStatus: async (status: BoardGameStatus): Promise<number> => {
    const { count, error } = await supabase
      .from("board_games")
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    if (error) throwRepositoryError("依狀態計算桌遊數量失敗", error);
    return count ?? 0;
  },

  create: async (payload: CreateBoardGameInput): Promise<BoardGame> => {
    const { data, error } = await supabase
      .from("board_games")
      .insert(payload)
      .select()
      .single();
    if (error) throwRepositoryError("建立桌遊失敗", error);
    return data;
  },

  createMany: async (payload: CreateBoardGameInput[]): Promise<BoardGame[]> => {
    if (payload.length === 0) return [];
    const { data, error } = await supabase
      .from("board_games")
      .insert(payload)
      .select();
    if (error) throwRepositoryError("批次建立桌遊失敗", error);
    return data ?? [];
  },

  updateById: async (
    id: string,
    payload: UpdateBoardGameInput,
  ): Promise<BoardGame | null> => {
    if (Object.keys(payload).length === 0) {
      return boardGamesRepository.findById(id);
    }

    const { data, error } = await supabase
      .from("board_games")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throwRepositoryError("更新桌遊失敗", error);
    return data;
  },

  updateStatusById: async (
    id: string,
    status: BoardGameStatus,
  ): Promise<BoardGame | null> => {
    return boardGamesRepository.updateById(id, { status });
  },

  deleteById: async (id: string): Promise<void> => {
    const { error } = await supabase.from("board_games").delete().eq("id", id);
    if (error) throwRepositoryError("刪除桌遊失敗", error);
  },
};
