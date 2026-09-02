import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "@/repositories/shared/pagination";
import { OrderOptions, PaginationQuery } from "@/repositories/shared/types";
import {
  BoardGameBorrowing,
  BoardGameBorrowingId,
  BorrowingStatus,
} from "@/types/database";

type CreateBoardGameBorrowingInput = Pick<
  BoardGameBorrowing,
  "board_game_id" | "user_id"
> &
  Partial<
    Pick<
      BoardGameBorrowing,
      | "borrowed_at"
      | "approved_by_user_id"
      | "returned_at"
      | "due_at"
      | "status"
    >
  >;

type UpdateBoardGameBorrowingInput = Partial<
  Pick<
    BoardGameBorrowing,
    "status" | "borrowed_at" | "due_at" | "returned_at" | "approved_by_user_id"
  >
>;

export type FindManyBoardGameBorrowingsOptions = PaginationQuery &
  OrderOptions<"created_at" | "borrowed_at" | "due_at" | "returned_at"> & {
    status?: BorrowingStatus | BorrowingStatus[];
    board_game_id?: string;
    user_id?: string;
    board_game_ids?: string[];
    user_ids?: string[];
    search_board_game_ids?: string[];
    search_user_ids?: string[];
  };

export const boardGameBorrowingsRepository = {
  findById: async (id: BoardGameBorrowingId): Promise<BoardGameBorrowing | null> => {
    const { data, error } = await supabase
      .from("board_game_borrowings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwRepositoryError("依 ID 尋找借用紀錄失敗", error);
    }
    return data;
  },

  /**
   * 通用列表查詢，供管理後台（跨使用者、跨桌遊）使用。
   */
  findMany: async (options: FindManyBoardGameBorrowingsOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      page: options.page,
      pageSize: options.pageSize,
    });
    const orderBy = options.orderBy ?? "created_at";
    const orderDirection = options.orderDirection ?? "desc";

    let query = supabase
      .from("board_game_borrowings")
      .select("*", { count: "exact" });

    if (options.status) {
      query = Array.isArray(options.status)
        ? query.in("status", options.status)
        : query.eq("status", options.status);
    }

    if (options.board_game_id) {
      query = query.eq("board_game_id", options.board_game_id);
    }

    if (options.user_id) {
      query = query.eq("user_id", options.user_id);
    }
    if (options.search_board_game_ids || options.search_user_ids) {
      const predicates = [
        options.search_board_game_ids?.length ? `board_game_id.in.(${options.search_board_game_ids.join(",")})` : "",
        options.search_user_ids?.length ? `user_id.in.(${options.search_user_ids.join(",")})` : "",
      ].filter(Boolean);
      if (!predicates.length) return buildPaginationResult<BoardGameBorrowing>([], 0, page, pageSize);
      query = query.or(predicates.join(","));
    }
    if (options.board_game_ids) {
      if (options.board_game_ids.length === 0) return buildPaginationResult<BoardGameBorrowing>([], 0, page, pageSize);
      query = query.in("board_game_id", options.board_game_ids);
    }
    if (options.user_ids) {
      if (options.user_ids.length === 0) return buildPaginationResult<BoardGameBorrowing>([], 0, page, pageSize);
      query = query.in("user_id", options.user_ids);
    }

    query = query
      .order(orderBy, { ascending: orderDirection === "asc" })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throwRepositoryError("取得借用紀錄列表失敗", error);

    return buildPaginationResult<BoardGameBorrowing>(
      data ?? [],
      count,
      page,
      pageSize,
    );
  },

  /**
   * 查詢某位使用者的借用紀錄（分頁）。
   */
  findManyByUserId: async (
    userId: string,
    options: Omit<FindManyBoardGameBorrowingsOptions, "user_id"> = {},
  ) => {
    return boardGameBorrowingsRepository.findMany({
      ...options,
      user_id: userId,
    });
  },

  /**
   * 查詢某個桌遊的借用紀錄（不分頁，供內部檢查目前是否有人借用等情境使用）。
   */
  findManyByBoardGameId: async (
    boardGameId: string,
    statuses?: BorrowingStatus[],
  ): Promise<BoardGameBorrowing[]> => {
    let query = supabase
      .from("board_game_borrowings")
      .select("*")
      .eq("board_game_id", boardGameId);

    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const { data, error } = await query;
    if (error) throwRepositoryError("依桌遊 ID 尋找借用紀錄失敗", error);
    return data ?? [];
  },

  /**
   * 找出某桌遊目前「借用中」的那一筆紀錄（若有）。
   */
  findBorrowedByBoardGameId: async (
    boardGameId: string,
  ): Promise<BoardGameBorrowing | null> => {
    const { data, error } = await supabase
      .from("board_game_borrowings")
      .select("*")
      .eq("board_game_id", boardGameId)
      .eq("status", "borrowed")
      .maybeSingle();

    if (error) throwRepositoryError("尋找桌遊目前借用紀錄失敗", error);
    return data;
  },

  /**
   * 檢查某使用者是否已對某桌遊有尚未結束的借閱流程
   * （pending / approved / borrowed），避免重複申請。
   */
  findOpenByUserIdAndBoardGameId: async (
    userId: string,
    boardGameId: string,
  ): Promise<BoardGameBorrowing | null> => {
    const { data, error } = await supabase
      .from("board_game_borrowings")
      .select("*")
      .eq("user_id", userId)
      .eq("board_game_id", boardGameId)
      .in("status", ["pending", "approved", "borrowed"])
      .maybeSingle();

    if (error) throwRepositoryError("檢查使用者借用狀態失敗", error);
    return data;
  },

  /**
   * 計算使用者的借用紀錄數量。
   * @param statuses 篩選特定狀態，不傳則計算全部紀錄（含 pending/rejected 等）
   */
  countByUserId: async (
    userId: string,
    statuses?: string[],
  ): Promise<number> => {
    let query = supabase
      .from("board_game_borrowings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const { count, error } = await query;

    if (error) {
      throwRepositoryError("計算使用者借用桌遊次數失敗", error);
    }

    return count ?? 0;
  },


  countByStatus: async (status: BorrowingStatus): Promise<number> => {
    const { count, error } = await supabase
      .from("board_game_borrowings")
      .select("*", { count: "exact", head: true })
      .eq("status", status);

    if (error) throwRepositoryError("依狀態計算借用紀錄數量失敗", error);
    return count ?? 0;
  },

  create: async (
    payload: CreateBoardGameBorrowingInput,
  ): Promise<BoardGameBorrowing> => {
    const { data, error } = await supabase
      .from("board_game_borrowings")
      .insert(payload)
      .select()
      .single();
    if (error) throwRepositoryError("建立借用紀錄失敗", error);
    return data;
  },

  checkout: async (
    borrowingId: BoardGameBorrowingId,
    dueAt: string,
  ): Promise<BoardGameBorrowing> => {
    const { data, error } = await supabase.rpc("checkout_borrowing", {
      p_borrowing_id: borrowingId,
      p_due_at: dueAt,
    });

    if (error) {
      throwRepositoryError("以交易方式確認借出失敗", error);
    }

    const borrowing = Array.isArray(data) ? data[0] : data;
    if (!borrowing) {
      throwRepositoryError(
        "以交易方式確認借出未回傳借用紀錄",
        new Error("checkout_borrowing returned no row"),
      );
    }

    return borrowing as BoardGameBorrowing;
  },

  returnBorrowing: async (
    borrowingId: BoardGameBorrowingId,
  ): Promise<BoardGameBorrowing> => {
    const { data, error } = await supabase.rpc("return_borrowing", {
      p_borrowing_id: borrowingId,
    });

    if (error) {
      throwRepositoryError("以交易方式確認歸還失敗", error);
    }

    const borrowing = Array.isArray(data) ? data[0] : data;
    if (!borrowing) {
      throwRepositoryError(
        "以交易方式確認歸還未回傳借用紀錄",
        new Error("return_borrowing returned no row"),
      );
    }

    return borrowing as BoardGameBorrowing;
  },

  updateById: async (
    id: BoardGameBorrowingId,
    payload: UpdateBoardGameBorrowingInput,
  ): Promise<BoardGameBorrowing | null> => {
    if (Object.keys(payload).length === 0) {
      return boardGameBorrowingsRepository.findById(id);
    }

    const { data, error } = await supabase
      .from("board_game_borrowings")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throwRepositoryError("更新借用紀錄失敗", error);
    return data;
  },

  updateDueAtIfBorrowed: async (
    id: BoardGameBorrowingId,
    dueAt: string,
  ): Promise<BoardGameBorrowing | null> => {
    const { data, error } = await supabase
      .from("board_game_borrowings")
      .update({ due_at: dueAt })
      .eq("id", id)
      .eq("status", "borrowed")
      .select()
      .maybeSingle();

    if (error) throwRepositoryError("更新借用預計歸還時間失敗", error);
    return data;
  },

  deleteTransactionally: async (id: BoardGameBorrowingId): Promise<void> => {
    const { error } = await supabase.rpc("delete_board_game_borrowing", {
      p_borrowing_id: id,
    });

    if (error) throwRepositoryError("刪除借用紀錄失敗", error);
  },

  deleteById: async (id: BoardGameBorrowingId): Promise<void> => {
    const { error } = await supabase
      .from("board_game_borrowings")
      .delete()
      .eq("id", id);
    if (error) throwRepositoryError("刪除借用紀錄失敗", error);
  },
};
