import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "@/repositories/shared/pagination";
import {
  buildIlikeSearch,
  buildNumericSearch,
} from "@/repositories/shared/search";
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
  OrderOptions<"name" | "created_at" | "updated_at" | "inventory_number"> & {
    search?: string;
    status?: BoardGameStatus | BoardGameStatus[];
    category_ids?: string[];
    location_ids?: string[];
  };

export type FindManyAdminBoardGamesOptions = PaginationQuery &
  OrderOptions<"name" | "created_at" | "updated_at" | "inventory_number"> & {
    search?: string;
    status?: BoardGameStatus;
    categoryId?: string;
    locationId?: string;
  };

export const boardGamesRepository = {
  findIdsBySearch: async (search: string): Promise<string[]> => {
    const keyword = search.trim();
    if (!keyword) return [];
    const conditions = [
      buildIlikeSearch(["name", "description"], keyword),
      buildNumericSearch(["inventory_number"], keyword),
    ].filter(Boolean);
    const { data, error } = await supabase.from("board_games").select("id").or(conditions.join(","));
    if (error) throwRepositoryError("搜尋桌遊 ID 失敗", error);
    return (data ?? []).map((item) => item.id);
  },
  findMany: async (options: FindManyBoardGamesOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      page: options.page,
      pageSize: options.pageSize,
    });
    const orderBy = options.orderBy ?? "inventory_number";
    const orderDirection = options.orderDirection ?? "desc";

    let query = supabase.from("board_games").select("*", { count: "exact" });

    const keyword = options.search?.trim();

    if (keyword) {
      const textSearch = buildIlikeSearch(["name", "description"], keyword);

      const numericSearch = buildNumericSearch(["inventory_number"], keyword);

      const searchConditions = [textSearch, numericSearch].filter(Boolean);

      query = query.or(searchConditions.join(","));
    }

    if (options.status) {
      query = Array.isArray(options.status)
        ? query.in("status", options.status)
        : query.eq("status", options.status);
    }

    if (options.category_ids?.length) {
      query = query.in("category_id", options.category_ids);
    }

    if (options.location_ids?.length) {
      query = query.in("location_id", options.location_ids);
    }

    query = query
      .order(orderBy, { ascending: orderDirection === "asc" })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throwRepositoryError("取得桌遊列表失敗", error);

    return buildPaginationResult<BoardGame>(data ?? [], count, page, pageSize);
  },

  findManyForAdmin: async (
    options: FindManyAdminBoardGamesOptions = {},
  ) => {
    return boardGamesRepository.findMany({
      page: options.page,
      pageSize: options.pageSize,
      search: options.search,
      status: options.status,
      category_ids: options.categoryId ? [options.categoryId] : undefined,
      location_ids: options.locationId ? [options.locationId] : undefined,
      orderBy: options.orderBy,
      orderDirection: options.orderDirection,
    });
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
    inventoryNumber: number,
    excludeId?: string,
  ): Promise<boolean> => {
    let query = supabase
      .from("board_games")
      .select("id", { count: "exact", head: true })
      .eq("inventory_number", inventoryNumber);
    if (excludeId) query = query.neq("id", excludeId);

    const { count, error } = await query;
    if (error) throwRepositoryError("檢查社產編號是否存在失敗", error);
    return (count ?? 0) > 0;
  },

  countAll: async (): Promise<number> => {
    const { count, error } = await supabase
      .from("board_games")
      .select("*", { count: "exact", head: true });
    if (error) throwRepositoryError("計算桌遊總數失敗", error);
    return count ?? 0;
  },

  countByStatus: async (status: BoardGameStatus): Promise<number> => {
    const { count, error } = await supabase
      .from("board_games")
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    if (error) throwRepositoryError("依狀態計算桌遊數量失敗", error);
    return count ?? 0;
  },

  countByCategoryId: async (categoryId: string): Promise<number> => {
    const { count, error } = await supabase.from("board_games").select("id", { count: "exact", head: true }).eq("category_id", categoryId);
    if (error) throwRepositoryError("統計桌遊種類社產數量失敗", error);
    return count ?? 0;
  },

  countByLocationId: async (locationId: string): Promise<number> => {
    const { count, error } = await supabase.from("board_games").select("id", { count: "exact", head: true }).eq("location_id", locationId);
    if (error) throwRepositoryError("統計桌遊位置社產數量失敗", error);
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

  existsByCategoryId: async (categoryId: string): Promise<boolean> => {
    const { count, error } = await supabase
      .from("board_games")
      .select("id", { count: "exact", head: true })
      .eq("category_id", categoryId);
    if (error) throwRepositoryError("檢查分類是否仍有桌遊使用失敗", error);
    return (count ?? 0) > 0;
  },

  existsByLocationId: async (locationId: string): Promise<boolean> => {
    const { count, error } = await supabase
      .from("board_games")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId);
    if (error) throwRepositoryError("檢查位置是否仍有桌遊使用失敗", error);
    return (count ?? 0) > 0;
  },
};
