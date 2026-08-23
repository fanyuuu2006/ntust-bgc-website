import "server-only";

import {
  boardGameBorrowingsRepository,
  FindManyBoardGameBorrowingsOptions,
} from "@/repositories/board-game-borrowings.repository";
import {
  boardGamesRepository,
  FindManyBoardGamesOptions,
} from "@/repositories/board-games.repository";
import {
  boardGameCategoriesRepository,
  CreateBoardGameCategoryInput,
  UpdateBoardGameCategoryInput,
} from "@/repositories/board-game-categories.repository";
import {
  boardGameLocationsRepository,
  CreateBoardGameLocationInput,
  UpdateBoardGameLocationInput,
} from "@/repositories/board-game-locations.repository";
import { buildPaginationResult } from "@/repositories/shared/pagination";
import {
  BoardGame,
  BoardGameCategory,
  BoardGameLocation,
  BoardGameStatus,
  BorrowingStatus,
} from "@/types/database";
import {
  BoardGameBorrowingWithBoardGame,
  BoardGameWithCategoryAndLocation,
} from "./board-games.types";
import {
  BoardNotFoundError,
  BorrowingNotFoundError,
  DuplicateInventoryNumberError,
  BoardGameCategoryNotFoundError,
  DuplicateBoardGameCategoryNameError,
  BoardGameCategoryInUseError,
  BoardGameLocationNotFoundError,
  DuplicateBoardGameLocationNameError,
  BoardGameLocationInUseError,
  BoardGameHasOpenBorrowingError,
  BoardGameNotAvailableForBorrowingError,
  BoardGameBorrowingConflictError,
  BorrowingStatusTransitionError,
  BorrowingPermissionError,
  BorrowingDueDateError,
} from "./board-games.errors";
import {
  createBoardGameSchema,
  updateBoardGameSchema,
} from "./board-games.schema";
import { membershipService } from "@/services/memberships/memberships.service";
import { usersRepository } from "@/repositories/users.repository";
import { userProfilesRepository } from "@/repositories/user-profiles.repository";
import type { BoardGameBorrowingForAdmin } from "./board-games.types";

export const boardGamesService = {
  /* ============================================================ *
   * 分類（Categories）
   * ============================================================ */

  listCategories: async (): Promise<BoardGameCategory[]> => {
    return boardGameCategoriesRepository.findAll();
  },

  getCategoryById: async (id: string): Promise<BoardGameCategory> => {
    const category = await boardGameCategoriesRepository.findById(id);
    if (!category) throw new BoardGameCategoryNotFoundError();
    return category;
  },

  createCategory: async (
    input: CreateBoardGameCategoryInput,
  ): Promise<BoardGameCategory> => {
    const isDuplicate = await boardGameCategoriesRepository.existsByName(
      input.name,
    );
    if (isDuplicate) throw new DuplicateBoardGameCategoryNameError();

    return boardGameCategoriesRepository.create(input);
  },

  updateCategory: async (
    id: string,
    input: UpdateBoardGameCategoryInput,
  ): Promise<BoardGameCategory> => {
    await boardGamesService.getCategoryById(id);

    if (input.name) {
      const isDuplicate = await boardGameCategoriesRepository.existsByName(
        input.name,
        id,
      );
      if (isDuplicate) throw new DuplicateBoardGameCategoryNameError();
    }

    const updated = await boardGameCategoriesRepository.updateById(id, input);
    if (!updated) throw new BoardGameCategoryNotFoundError();
    return updated;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await boardGamesService.getCategoryById(id);

    const inUse = await boardGamesRepository.existsByCategoryId(id);
    if (inUse) throw new BoardGameCategoryInUseError();

    await boardGameCategoriesRepository.deleteById(id);
  },

  /* ============================================================ *
   * 位置（Locations）
   * ============================================================ */

  listLocations: async (): Promise<BoardGameLocation[]> => {
    return boardGameLocationsRepository.findAll();
  },

  getLocationById: async (id: string): Promise<BoardGameLocation> => {
    const location = await boardGameLocationsRepository.findById(id);
    if (!location) throw new BoardGameLocationNotFoundError();
    return location;
  },

  createLocation: async (
    input: CreateBoardGameLocationInput,
  ): Promise<BoardGameLocation> => {
    const isDuplicate = await boardGameLocationsRepository.existsByName(
      input.name,
    );
    if (isDuplicate) throw new DuplicateBoardGameLocationNameError();

    return boardGameLocationsRepository.create(input);
  },

  updateLocation: async (
    id: string,
    input: UpdateBoardGameLocationInput,
  ): Promise<BoardGameLocation> => {
    await boardGamesService.getLocationById(id);

    if (input.name) {
      const isDuplicate = await boardGameLocationsRepository.existsByName(
        input.name,
        id,
      );
      if (isDuplicate) throw new DuplicateBoardGameLocationNameError();
    }

    const updated = await boardGameLocationsRepository.updateById(id, input);
    if (!updated) throw new BoardGameLocationNotFoundError();
    return updated;
  },

  deleteLocation: async (id: string): Promise<void> => {
    await boardGamesService.getLocationById(id);

    const inUse = await boardGamesRepository.existsByLocationId(id);
    if (inUse) throw new BoardGameLocationInUseError();

    await boardGameLocationsRepository.deleteById(id);
  },

  /* ============================================================ *
   * 桌遊（Board Games）查詢
   * ============================================================ */

  getBoardGameById: async (id: string): Promise<BoardGame> => {
    const boardGame = await boardGamesRepository.findById(id);
    if (!boardGame) throw new BoardNotFoundError();
    return boardGame;
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
   * 附帶分類與位置資料的單一桌遊詳情（供前台桌遊詳情頁使用）。
   */
  getBoardGameWithCategoryAndLocation: async (
    id: string,
  ): Promise<BoardGameWithCategoryAndLocation> => {
    const boardGame = await boardGamesService.getBoardGameById(id);
    const [category, location] = await Promise.all([
      boardGamesService.getCategoryById(boardGame.category_id),
      boardGamesService.getLocationById(boardGame.location_id),
    ]);

    return { ...boardGame, category, location };
  },

  /**
   * 桌遊列表附帶分類與位置資料。用批次查詢（findManyByIds）避免每筆
   * 桌遊各查一次分類/位置造成的 N+1 問題。
   */
  listBoardGamesWithCategoryAndLocation: async (
    options: FindManyBoardGamesOptions = {},
  ): Promise<
    ReturnType<typeof buildPaginationResult<BoardGameWithCategoryAndLocation>>
  > => {
    const result = await boardGamesRepository.findMany(options);

    const categoryIds = [...new Set(result.data.map((g) => g.category_id))];
    const locationIds = [...new Set(result.data.map((g) => g.location_id))];

    const [categories, locations] = await Promise.all([
      boardGameCategoriesRepository.findManyByIds(categoryIds),
      boardGameLocationsRepository.findManyByIds(locationIds),
    ]);

    const data = result.data.map((boardGame) => {
      const category = categories.find((c) => c.id === boardGame.category_id);
      const location = locations.find((l) => l.id === boardGame.location_id);

      if (!category) throw new BoardGameCategoryNotFoundError();
      if (!location) throw new BoardGameLocationNotFoundError();

      return { ...boardGame, category, location };
    });

    return { ...result, data };
  },

  /* ============================================================ *
   * 桌遊（Board Games）管理（幹部用）
   * ============================================================ */

  createBoardGame: async (input: unknown): Promise<BoardGame> => {
    const data = createBoardGameSchema.parse(input);

    const [isDuplicate] = await Promise.all([
      boardGamesRepository.existsByInventoryNumber(data.inventory_number),
      boardGamesService.getCategoryById(data.category_id),
      boardGamesService.getLocationById(data.location_id),
    ]);
    if (isDuplicate) throw new DuplicateInventoryNumberError();

    return boardGamesRepository.create(data);
  },

  updateBoardGame: async (id: string, input: unknown): Promise<BoardGame> => {
    const boardGame = await boardGamesService.getBoardGameById(id);
    const data = updateBoardGameSchema.parse(input);

    const checks: Promise<unknown>[] = [];

    if (data.inventory_number) {
      checks.push(
        boardGamesRepository
          .existsByInventoryNumber(data.inventory_number, id)
          .then((isDuplicate) => {
            if (isDuplicate) throw new DuplicateInventoryNumberError();
          }),
      );
    }
    if (data.category_id) {
      checks.push(boardGamesService.getCategoryById(data.category_id));
    }
    if (data.location_id) {
      checks.push(boardGamesService.getLocationById(data.location_id));
    }

    if (data.status && data.status !== boardGame.status) {
      checks.push(
        boardGameBorrowingsRepository
          .findManyByBoardGameId(id, ["pending", "approved", "borrowed"])
          .then((openBorrowings) => {
            if (openBorrowings.length > 0) {
              throw new BoardGameHasOpenBorrowingError();
            }
          }),
      );
    }

    await Promise.all(checks);

    const updated = await boardGamesRepository.updateById(id, data);
    if (!updated) throw new BoardNotFoundError();
    return updated;
  },

  deleteBoardGame: async (id: string): Promise<void> => {
    await boardGamesService.getBoardGameById(id);

    const openBorrowings =
      await boardGameBorrowingsRepository.findManyByBoardGameId(id, [
        "pending",
        "approved",
        "borrowed",
      ]);
    if (openBorrowings.length > 0) {
      throw new BoardGameHasOpenBorrowingError();
    }

    await boardGamesRepository.deleteById(id);
  },

  /* ============================================================ *
   * 借閱統計
   * ============================================================ */

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

  /**
   * 取得使用者的借用紀錄（附帶桌遊資料），依申請時間排序。
   */
  getBorrowingsByUserId: async (
    userId: string,
    options: Omit<FindManyBoardGameBorrowingsOptions, "user_id"> = {},
  ): Promise<
    ReturnType<typeof buildPaginationResult<BoardGameBorrowingWithBoardGame>>
  > => {
    const result = await boardGameBorrowingsRepository.findManyByUserId(
      userId,
      { orderBy: "created_at", orderDirection: "desc", ...options },
    );

    const boardGameIds = [...new Set(result.data.map((b) => b.board_game_id))];
    const boardGames = await boardGamesRepository.findManyByIds(boardGameIds);

    const data = result.data.map((borrowing) => {
      const boardGame = boardGames.find(
        (game) => game.id === borrowing.board_game_id,
      );
      if (!boardGame) throw new BoardNotFoundError();
      return { ...borrowing, board_game: boardGame };
    });

    return { ...result, data };
  },

  getBorrowingById: async (
    borrowingId: string,
  ): Promise<BoardGameBorrowingWithBoardGame> => {
    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new BorrowingNotFoundError();

    const boardGame = await boardGamesService.getBoardGameById(
      borrowing.board_game_id,
    );

    return { ...borrowing, board_game: boardGame };
  },

  listBorrowings: async (
    options: FindManyBoardGameBorrowingsOptions = {},
  ): Promise<
    ReturnType<typeof buildPaginationResult<BoardGameBorrowingForAdmin>>
  > => {
    const result = await boardGameBorrowingsRepository.findMany({
      orderBy: "created_at",
      orderDirection: "desc",
      ...options,
    });

    const boardGameIds = [...new Set(result.data.map((b) => b.board_game_id))];
    const userIds = [...new Set(result.data.map((borrowing) => borrowing.user_id))];
    const approverIds = [
      ...new Set(
        result.data
          .map((borrowing) => borrowing.approved_by_user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const [boardGames, users, profiles, approvers] = await Promise.all([
      boardGamesRepository.findManyByIds(boardGameIds),
      usersRepository.findManyByIds(userIds),
      userProfilesRepository.findManyByUserIds(userIds),
      usersRepository.findManyByIds(approverIds),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const profilesByUserId = new Map(
      profiles.map((profile) => [profile.user_id, profile]),
    );
    const approversById = new Map(approvers.map((user) => [user.id, user]));

    const data = result.data.map((borrowing) => {
      const boardGame = boardGames.find(
        (game) => game.id === borrowing.board_game_id,
      );
      if (!boardGame) throw new BoardNotFoundError();
      const user = usersById.get(borrowing.user_id);
      if (!user) throw new Error("找不到借用人資料");

      return {
        ...borrowing,
        board_game: boardGame,
        user,
        user_profile: profilesByUserId.get(user.id) ?? null,
        approved_by_user: borrowing.approved_by_user_id
          ? approversById.get(borrowing.approved_by_user_id) ?? null
          : null,
      };
    });

    return { ...result, data };
  },

  /* ============================================================ *
   * 借閱流程：pending -> approved/rejected -> borrowed -> returned
   * ============================================================ */

  /**
   * 提出借用申請。
   * - 桌遊必須存在且狀態為 available
   * - 使用者必須為目前學年度的 active 社員
   * - 使用者對同一桌遊不可有尚未結束的借閱流程（pending/approved/borrowed）
   */
  requestBorrowing: async (userId: string, boardGameId: string) => {
    const boardGame = await boardGamesService.getBoardGameById(boardGameId);
    if (boardGame.status !== "available") {
      throw new BoardGameNotAvailableForBorrowingError();
    }

    const isCurrentActiveMember = await membershipService.isCurrentActiveMember(
      userId,
    );
    if (!isCurrentActiveMember) {
      throw new BorrowingPermissionError();
    }

    const existing =
      await boardGameBorrowingsRepository.findOpenByUserIdAndBoardGameId(
        userId,
        boardGameId,
      );
    if (existing) {
      throw new BoardGameBorrowingConflictError();
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
    if (!borrowing) throw new BorrowingNotFoundError();
    if (borrowing.status !== "pending") {
      throw new BorrowingStatusTransitionError("pending", borrowing.status);
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
    if (!borrowing) throw new BorrowingNotFoundError();
    if (borrowing.status !== "pending") {
      throw new BorrowingStatusTransitionError("pending", borrowing.status);
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
    if (!borrowing) throw new BorrowingNotFoundError();
    if (borrowing.status !== "approved") {
      throw new BorrowingStatusTransitionError("approved", borrowing.status);
    }

    const dueAtDate = new Date(dueAt);
    if (Number.isNaN(dueAtDate.getTime()) || dueAtDate <= new Date()) {
      throw new BorrowingDueDateError();
    }

    const [updated] = await Promise.all([
      boardGameBorrowingsRepository.updateById(borrowingId, {
        status: "borrowed",
        borrowed_at: new Date().toISOString(),
        due_at: dueAt,
      }),
      boardGamesRepository.updateStatusById(
        borrowing.board_game_id,
        "borrowed",
      ),
    ]);

    return updated;
  },

  /**
   * 歸還：借用紀錄改為 returned，桌遊狀態改回 available。
   */
  returnBorrowing: async (borrowingId: string) => {
    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new BorrowingNotFoundError();
    if (borrowing.status !== "borrowed") {
      throw new BorrowingStatusTransitionError("borrowed", borrowing.status);
    }

    const [updated] = await Promise.all([
      boardGameBorrowingsRepository.updateById(borrowingId, {
        status: "returned",
        returned_at: new Date().toISOString(),
      }),
      boardGamesRepository.updateStatusById(
        borrowing.board_game_id,
        "available",
      ),
    ]);

    return updated;
  },

  countAllBoardGames: async (): Promise<number> => {
    return boardGamesRepository.countAll();
  },

  /**
   * 依狀態計算桌遊數量（供管理後台總覽統計使用）。
   */
  countBoardGamesByStatus: async (status: BoardGameStatus): Promise<number> => {
    return boardGamesRepository.countByStatus(status);
  },

  countBoardGamesByCategoryId: async (categoryId: string): Promise<number> => {
    return boardGamesRepository.countByCategoryId(categoryId);
  },

  countBoardGamesByLocationId: async (locationId: string): Promise<number> => {
    return boardGamesRepository.countByLocationId(locationId);
  },

  /**
   * 依狀態計算借用紀錄數量（供管理後台總覽統計使用）。
   */
  countBorrowingsByStatus: async (status: BorrowingStatus): Promise<number> => {
    return boardGameBorrowingsRepository.countByStatus(status);
  },
};
