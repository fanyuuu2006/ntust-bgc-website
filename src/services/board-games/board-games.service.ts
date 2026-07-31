import "server-only";

import {
  boardGameBorrowingsRepository,
  FindManyBoardGameBorrowingsOptions,
} from "@/repositories/board-game-borrowings.repository";
import {
  boardGamesRepository,
  FindManyBoardGamesOptions,
} from "@/repositories/board-games.repository";
import { BoardGame } from "@/types/database";
import { BoardGameBorrowingWithBoardGame } from "./board-games.types";
import { buildPaginationResult } from "@/repositories/shared/pagination";

export const boardGamesService = {
  /**
   * 使用者累計借用次數：只算真正成立過的借用（borrowed / returned），
   * 不計入 pending（審核中）、rejected（已拒絕）。
   */
  getTotalBorrowedCount: async (userId: string): Promise<number> => {
    return boardGameBorrowingsRepository.countByUserId(userId, [
      "borrowed",
      "returned",
    ]);
  },

  /**
   * 使用者目前借用中（尚未歸還）的桌遊數量。
   */
  getCurrentlyBorrowedCount: async (userId: string): Promise<number> => {
    return boardGameBorrowingsRepository.countByUserId(userId, ["borrowed"]);
  },

  /* ---------------------------------------------------------- *
   * 查詢
   * ---------------------------------------------------------- */

  getBoardGameById: async (id: string): Promise<BoardGame | null> => {
    return boardGamesRepository.findById(id);
  },

  listBoardGames: async (options: FindManyBoardGamesOptions = {}) => {
    return boardGamesRepository.findMany(options);
  },

  /**
   * 目前可借（status = available）的桌遊列表。
   */
  listAvailableBoardGames: async (
    options: Omit<FindManyBoardGamesOptions, "status"> = {},
  ) => {
    return boardGamesRepository.findMany({ ...options, status: "available" });
  },

  /**
   * 取得使用者的借用紀錄（附帶桌遊資料），依申請時間排序。
   * pageSize / orderDirection 由呼叫端決定，用法同
   * membershipService.getMembershipsByUserId。
   */

  getBorrowingsByUserId: async (
    userId: string,
    options: Omit<FindManyBoardGameBorrowingsOptions, "user_id"> = {},
  ): Promise<
    ReturnType<typeof buildPaginationResult<BoardGameBorrowingWithBoardGame>>
  > => {
    const result = await boardGameBorrowingsRepository.findManyByUserId(
      userId,
      {
        orderBy: "created_at",
        orderDirection: "desc",
        ...options,
      },
    );

    const boardGameIds = [
      ...new Set(result.data.map((borrowing) => borrowing.board_game_id)),
    ];
    const boardGames = await boardGamesRepository.findManyByIds(boardGameIds);

    const data = result.data.map((borrowing) => ({
      ...borrowing,
      board_game:
        boardGames.find((game) => game.id === borrowing.board_game_id) ?? null,
    }));

    return { ...result, data };
  },

  /* ---------------------------------------------------------- *
   * 借閱流程：pending -> approved/rejected -> borrowed -> returned
   * ---------------------------------------------------------- */

  /**
   * 提出借用申請。
   * - 桌遊必須存在且狀態為 available
   * - 使用者對同一桌遊不可有尚未結束的借閱流程（pending/approved/borrowed）
   */
  requestBorrowing: async (userId: string, boardGameId: string) => {
    const boardGame = await boardGamesRepository.findById(boardGameId);
    if (!boardGame) {
      throw new Error("桌遊不存在");
    }
    if (boardGame.status !== "available") {
      throw new Error("此桌遊目前無法借用");
    }

    const existing =
      await boardGameBorrowingsRepository.findOpenByUserIdAndBoardGameId(
        userId,
        boardGameId,
      );
    if (existing) {
      throw new Error("已有進行中的借用申請，請勿重複申請");
    }

    return boardGameBorrowingsRepository.create({
      board_game_id: boardGameId,
      user_id: userId,
      status: "pending",
    });
  },

  /**
   * 核准借用申請（不代表已實際借出，實際借出請呼叫 checkOutBorrowing）。
   */
  approveBorrowing: async (borrowingId: string, approverUserId: string) => {
    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new Error("借用紀錄不存在");
    if (borrowing.status !== "pending") {
      throw new Error("只有審核中的申請可以被核准");
    }

    return boardGameBorrowingsRepository.updateById(borrowingId, {
      status: "approved",
      approved_by_user_id: approverUserId,
    });
  },

  /**
   * 拒絕借用申請。
   */
  rejectBorrowing: async (borrowingId: string, approverUserId: string) => {
    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new Error("借用紀錄不存在");
    if (borrowing.status !== "pending") {
      throw new Error("只有審核中的申請可以被拒絕");
    }

    return boardGameBorrowingsRepository.updateById(borrowingId, {
      status: "rejected",
      approved_by_user_id: approverUserId,
    });
  },

  /**
   * 實際借出：申請必須已核准，並將桌遊狀態改為 borrowed。
   */
  checkOutBorrowing: async (borrowingId: string, dueAt: string) => {
    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new Error("借用紀錄不存在");
    if (borrowing.status !== "approved") {
      throw new Error("只有已核准的申請可以借出");
    }

    const updated = await boardGameBorrowingsRepository.updateById(
      borrowingId,
      {
        status: "borrowed",
        borrowed_at: new Date().toISOString(),
        due_at: dueAt,
      },
    );

    await boardGamesRepository.updateStatusById(
      borrowing.board_game_id,
      "borrowed",
    );

    return updated;
  },

  /**
   * 歸還：借用紀錄改為 returned，桌遊狀態改回 available。
   */
  returnBorrowing: async (borrowingId: string) => {
    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new Error("借用紀錄不存在");
    if (borrowing.status !== "borrowed") {
      throw new Error("只有借用中的紀錄可以歸還");
    }

    const updated = await boardGameBorrowingsRepository.updateById(
      borrowingId,
      {
        status: "returned",
        returned_at: new Date().toISOString(),
      },
    );

    await boardGamesRepository.updateStatusById(
      borrowing.board_game_id,
      "available",
    );

    return updated;
  },
};
