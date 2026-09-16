import "server-only";
import type { UserBorrowingListItem } from "./board-games.types";
import { cachePublicData, invalidatePublicData, invalidatePublicDataSafely } from "@/libs/cache/public-data";

import {
  boardGameBorrowingsRepository,
  FindManyBoardGameBorrowingsOptions,
} from "@/repositories/board-game-borrowings.repository";
import {
  boardGamesRepository,
  type FindManyAdminBoardGamesOptions,
  FindManyBoardGamesOptions,
} from "@/repositories/board-games.repository";
import {
  boardGameStatisticsRepository,
  type FindManyBoardGamesWithStatsOptions,
} from "@/repositories/board-game-statistics.repository";
import {
  boardGameCategoriesRepository,
  CreateBoardGameCategoryInput,
  type FindManyBoardGameCategoriesOptions,
  UpdateBoardGameCategoryInput,
} from "@/repositories/board-game-categories.repository";
import {
  boardGameLocationsRepository,
  CreateBoardGameLocationInput,
  type FindManyBoardGameLocationsOptions,
  UpdateBoardGameLocationInput,
} from "@/repositories/board-game-locations.repository";
import { buildPaginationResult } from "@/repositories/shared/pagination";
import {
  BoardGame,
  BoardGameBorrowingId,
  BoardGameCategory,
  BoardGameLocation,
  BoardGameStatus,
  BorrowingStatus,
} from "@/types/database";
import {
  BoardGameBorrowingWithBoardGame,
  BoardGameDiscoveryItem,
  HomeBoardGameItem,
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
  BoardGameHasReviewsError,
  BoardGameNotAvailableForBorrowingError,
  BoardGameBorrowingConflictError,
  BorrowingStatusTransitionError,
  BorrowingDueDateError,
  BorrowingWorkflowConflictError,
  BorrowingCancellationConflictError,
} from "./board-games.errors";
import { RepositoryError } from "@/repositories/shared/errors";
import {
  createBoardGameSchema,
  updateBoardGameSchema,
} from "./board-games.schema";
import { membershipService } from "@/services/memberships/memberships.service";
import { usersRepository } from "@/repositories/users.repository";
import { userProfilesRepository } from "@/repositories/user-profiles.repository";
import type { BoardGameBorrowingForAdmin } from "./board-games.types";

type PostgrestErrorLike = {
  code?: string;
  constraint?: string;
  message?: string;
};

const DASHBOARD_BORROWING_LIMIT = 3;

function getRepositoryDatabaseError(error: unknown): PostgrestErrorLike | null {
  if (!(error instanceof RepositoryError) || !error.cause || typeof error.cause !== "object") {
    return null;
  }

  return error.cause as PostgrestErrorLike;
}

function rethrowInventoryNumberConflict(error: unknown): never {
  const databaseError = getRepositoryDatabaseError(error);
  if (databaseError?.code === "23505" && (
    databaseError.constraint === "board_games_inventory_number_key" ||
    databaseError.message?.includes('"board_games_inventory_number_key"')
  )) {
    throw new DuplicateInventoryNumberError();
  }
  throw error;
}

function rethrowBorrowingRequestConflict(error: unknown): never {
  const databaseError = getRepositoryDatabaseError(error);
  if (
    databaseError?.code === "23505" &&
    databaseError.constraint === "board_game_borrowings_one_open_user_game_idx"
  ) {
    throw new BoardGameBorrowingConflictError();
  }

  throw error;
}

function rethrowBorrowingApprovalConflict(error: unknown): never {
  const databaseError = getRepositoryDatabaseError(error);
  if (
    databaseError?.code === "23505" &&
    databaseError.constraint === "board_game_borrowings_one_active_game_idx"
  ) {
    throw new BoardGameHasOpenBorrowingError();
  }

  throw error;
}

function rethrowBoardGameDeleteConflict(error: unknown): never {
  const databaseError = getRepositoryDatabaseError(error);
  if (
    databaseError?.code === "23503" &&
    (databaseError.constraint === "board_game_reviews_board_game_id_fkey" ||
      databaseError.message?.includes('"board_game_reviews_board_game_id_fkey"'))
  ) {
    throw new BoardGameHasReviewsError();
  }
  throw error;
}

function rethrowBorrowingTransactionError(error: unknown): never {
  const databaseError = getRepositoryDatabaseError(error);

  if (databaseError?.code === "P0001") {
    switch (databaseError.message) {
      case "BORROWING_NOT_FOUND":
        throw new BorrowingNotFoundError();
      case "BORROWING_NOT_APPROVED":
        throw new BorrowingWorkflowConflictError(
          "此借用紀錄尚未核准，無法確認借出。",
        );
      case "BORROWING_NOT_BORROWED":
        throw new BorrowingWorkflowConflictError(
          "此借用紀錄尚未借出，無法確認歸還。",
        );
      case "BORROWING_DUE_DATE_INVALID":
        throw new BorrowingDueDateError();
      case "BOARD_GAME_NOT_AVAILABLE":
        throw new BoardGameNotAvailableForBorrowingError();
      case "BOARD_GAME_STATUS_CONFLICT":
        throw new BorrowingWorkflowConflictError(
          "桌遊目前狀態與借用紀錄不一致，無法確認歸還。",
        );
      case "BOARD_GAME_NOT_FOUND":
        throw new BorrowingWorkflowConflictError(
          "找不到此借用紀錄對應的桌遊。",
        );
    }
  }

  throw error;
}

const cachedCategories = cachePublicData("categories", () => boardGameCategoriesRepository.findAll());
const cachedLocations = cachePublicData("locations", () => boardGameLocationsRepository.findAll());
const cachedPopularGames = cachePublicData("popularGames", () => boardGameStatisticsRepository.findPopular({ limit: 6 }));

export const boardGamesService = {
  getNextInventoryNumber: async (): Promise<number | null> => {
    const highest = await boardGamesRepository.findHighestInventoryNumber();
    if (highest === null || highest < 1) return 1;
    // PostgreSQL bigint can exceed JavaScript's safe integer range. Do not round a suggestion.
    return Number.isSafeInteger(highest) && highest < Number.MAX_SAFE_INTEGER
      ? highest + 1
      : null;
  },
  /* ============================================================ *
   * 分類（Categories）
   * ============================================================ */

  listCategories: async (): Promise<BoardGameCategory[]> => {
    return cachedCategories();
  },
  listCategoriesForAdmin: (options: FindManyBoardGameCategoriesOptions = {}) => boardGameCategoriesRepository.findMany(options),

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

    const created = await boardGameCategoriesRepository.create(input);
    invalidatePublicData("categories", "popularGames");
    return created;
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
    invalidatePublicData("categories", "popularGames");
    return updated;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await boardGamesService.getCategoryById(id);

    const inUse = await boardGamesRepository.existsByCategoryId(id);
    if (inUse) throw new BoardGameCategoryInUseError();

    await boardGameCategoriesRepository.deleteById(id);
    invalidatePublicData("categories", "popularGames");
  },

  /* ============================================================ *
   * 位置（Locations）
   * ============================================================ */

  listLocations: async (): Promise<BoardGameLocation[]> => {
    return cachedLocations();
  },
  listLocationsForAdmin: (options: FindManyBoardGameLocationsOptions = {}) => boardGameLocationsRepository.findMany(options),

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

    const created = await boardGameLocationsRepository.create(input);
    invalidatePublicData("locations", "popularGames");
    return created;
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
    invalidatePublicData("locations", "popularGames");
    return updated;
  },

  deleteLocation: async (id: string): Promise<void> => {
    await boardGamesService.getLocationById(id);

    const inUse = await boardGamesRepository.existsByLocationId(id);
    if (inUse) throw new BoardGameLocationInUseError();

    await boardGameLocationsRepository.deleteById(id);
    invalidatePublicData("locations", "popularGames");
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

  listAdminBoardGamesWithCategoryAndLocation: async (
    options: FindManyAdminBoardGamesOptions = {},
  ): Promise<
    ReturnType<typeof buildPaginationResult<BoardGameWithCategoryAndLocation>>
  > => {
    const result = await boardGamesRepository.findManyForAdmin(options);

    return result;
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

    try {
      const created = await boardGamesRepository.create(data);
      invalidatePublicData("popularGames");
      return created;
    } catch (error) {
      return rethrowInventoryNumberConflict(error);
    }
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

    const updated = await boardGamesRepository.updateById(id, data).catch(rethrowInventoryNumberConflict);
    if (!updated) throw new BoardNotFoundError();
    invalidatePublicData("popularGames");
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

    await boardGamesRepository.deleteById(id).catch(rethrowBoardGameDeleteConflict);
    invalidatePublicData("popularGames");
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
    options: Omit<FindManyBoardGameBorrowingsOptions, "user_id"> & {
      search?: string;
    } = {},
  ): Promise<
    ReturnType<typeof buildPaginationResult<UserBorrowingListItem>>
  > => {
    const { search, ...repositoryOptions } = options;
    const matchingBoardGameIds = search?.trim()
      ? await boardGamesRepository.findIdsBySearch(search)
      : undefined;

    const result = await boardGameBorrowingsRepository.findManyByUserIdWithGame(
      userId,
      {
        orderBy: "created_at",
        orderDirection: "desc",
        ...repositoryOptions,
        board_game_ids: matchingBoardGameIds,
      },
    );

    if (result.data.some((item) => !item.board_game)) throw new BoardNotFoundError();
    return result;
  },

  listBoardGameDiscovery: async (
    options: FindManyBoardGamesWithStatsOptions = {},
  ): Promise<ReturnType<typeof buildPaginationResult<BoardGameDiscoveryItem>>> => {
    const result = await boardGameStatisticsRepository.findMany(options);
    return result;
  },

  listPopularBoardGames: async (
    options: { limit?: number } = {},
  ): Promise<HomeBoardGameItem[]> => {
    return (options.limit ?? 6) === 6 ? cachedPopularGames() : boardGameStatisticsRepository.findPopular(options);
  },

  getOpenBorrowingForUserAndBoardGame: async (
    userId: string,
    boardGameId: string,
  ) => {
    return boardGameBorrowingsRepository.findOpenByUserIdAndBoardGameId(
      userId,
      boardGameId,
    );
  },

  getDashboardOpenBorrowingsByUserId: async (
    userId: string,
  ): Promise<UserBorrowingListItem[]> => {
    // 各組的排序不同：借用中按期限，其餘按申請時間，最後依狀態優先順序取三筆。
    // 任意 IN + LIMIT 無法保證相同結果；保留三個有上限的查詢，關聯載入桌遊。
    const [borrowed, approved, pending] = await Promise.all([
      boardGameBorrowingsRepository.findManyByUserIdWithGame(userId, {
        status: "borrowed",
        orderBy: "due_at",
        orderDirection: "asc",
        page: 1,
        pageSize: DASHBOARD_BORROWING_LIMIT,
      }, false),
      boardGameBorrowingsRepository.findManyByUserIdWithGame(userId, {
        status: "approved",
        orderBy: "created_at",
        orderDirection: "asc",
        page: 1,
        pageSize: DASHBOARD_BORROWING_LIMIT,
      }, false),
      boardGameBorrowingsRepository.findManyByUserIdWithGame(userId, {
        status: "pending",
        orderBy: "created_at",
        orderDirection: "asc",
        page: 1,
        pageSize: DASHBOARD_BORROWING_LIMIT,
      }, false),
    ]);
    const borrowings = takeDashboardBorrowings(
      [borrowed.data, approved.data, pending.data],
      DASHBOARD_BORROWING_LIMIT,
    );
    return borrowings.filter((item) => item.board_game);
  },

  getBorrowingById: async (
    borrowingId: BoardGameBorrowingId,
  ): Promise<BoardGameBorrowingWithBoardGame> => {
    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new BorrowingNotFoundError();

    const boardGame = await boardGamesService.getBoardGameById(
      borrowing.board_game_id,
    );

    return { ...borrowing, board_game: boardGame };
  },

  listBorrowings: async (
    options: FindManyBoardGameBorrowingsOptions & { search?: string } = {},
  ): Promise<
    ReturnType<typeof buildPaginationResult<BoardGameBorrowingForAdmin>>
  > => {
    const keyword = options.search?.trim();
    const [matchingBoardGameIds, matchingUserIds, matchingProfileUserIds] = keyword
      ? await Promise.all([
          boardGamesRepository.findIdsBySearch(keyword),
          usersRepository.findIdsBySearch(keyword),
          userProfilesRepository.findUserIdsBySearch(keyword),
        ])
      : [undefined, undefined, undefined];
    const searchBoardGameIds = matchingBoardGameIds;
    const searchUserIds = keyword
      ? [...new Set([...(matchingUserIds ?? []), ...(matchingProfileUserIds ?? [])])]
      : undefined;
    const result = await boardGameBorrowingsRepository.findMany({
      orderBy: "created_at",
      orderDirection: "desc",
      ...options,
      ...(keyword ? { search_board_game_ids: searchBoardGameIds, search_user_ids: searchUserIds } : {}),
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
    const identityUserIds = [...new Set([...userIds, ...approverIds])];
    const [boardGames, users, profiles, approvers, membershipEligibility] = await Promise.all([
      boardGamesRepository.findManyByIds(boardGameIds),
      usersRepository.findManyByIds(userIds),
      userProfilesRepository.findManyByUserIds(identityUserIds),
      usersRepository.findManyByIds(approverIds),
      membershipService.getUserMembershipEligibility(userIds),
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
        approved_by_user_profile: borrowing.approved_by_user_id
          ? profilesByUserId.get(borrowing.approved_by_user_id) ?? null
          : null,
        is_current_academic_year_member:
          membershipEligibility[user.id]?.hasCurrentMembership ?? false,
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
   * - 使用者必須已登入（身份由 Route Handler 取得）
   * - 使用者對同一桌遊不可有尚未結束的借閱流程（pending/approved/borrowed）
   */
  requestBorrowing: async (userId: string, boardGameId: string) => {
    const boardGame = await boardGamesService.getBoardGameById(boardGameId);
    if (boardGame.status !== "available") {
      throw new BoardGameNotAvailableForBorrowingError();
    }

    const existing =
      await boardGameBorrowingsRepository.findOpenByUserIdAndBoardGameId(
        userId,
        boardGameId,
      );
    if (existing) {
      throw new BoardGameBorrowingConflictError();
    }

    try {
      return await boardGameBorrowingsRepository.create({
        board_game_id: boardGameId,
        user_id: userId,
        status: "pending",
      });
    } catch (error) {
      return rethrowBorrowingRequestConflict(error);
    }
  },

  cancelPendingBorrowingByUserId: async (
    userId: string,
    borrowingId: BoardGameBorrowingId,
  ) => {
    const cancelled = await boardGameBorrowingsRepository.cancelPendingByIdAndUserId(
      borrowingId,
      userId,
    );
    if (cancelled) return cancelled;

    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing || borrowing.user_id !== userId) {
      throw new BorrowingNotFoundError();
    }
    throw new BorrowingCancellationConflictError();
  },

  /**
   * 核准借用申請（不代表已實際借出，實際借出請呼叫 checkOutBorrowing）。
   */
  approveBorrowing: async (borrowingId: BoardGameBorrowingId, approverUserId: string) => {
    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new BorrowingNotFoundError();
    if (borrowing.status !== "pending") {
      throw new BorrowingStatusTransitionError("pending", borrowing.status);
    }

    try {
      const approved = await boardGameBorrowingsRepository.approve(
        borrowingId,
        approverUserId,
      );
      if (approved) return approved;

      const latest = await boardGameBorrowingsRepository.findById(borrowingId);
      if (!latest) throw new BorrowingNotFoundError();
      throw new BorrowingStatusTransitionError("pending", latest.status);
    } catch (error) {
      return rethrowBorrowingApprovalConflict(error);
    }
  },

  /**
   * 拒絕借用申請。
   */
  rejectBorrowing: async (borrowingId: BoardGameBorrowingId, approverUserId: string) => {
    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new BorrowingNotFoundError();
    if (borrowing.status !== "pending") {
      throw new BorrowingStatusTransitionError("pending", borrowing.status);
    }

    const rejected = await boardGameBorrowingsRepository.reject(
      borrowingId,
      approverUserId,
    );
    if (rejected) return rejected;

    const latest = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!latest) throw new BorrowingNotFoundError();
    throw new BorrowingStatusTransitionError("pending", latest.status);
  },

  /**
   * 實際借出：申請必須已核准，並將桌遊狀態改為 borrowed。
   */
  checkOutBorrowing: async (borrowingId: BoardGameBorrowingId, dueAt: string) => {
    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new BorrowingNotFoundError();
    if (borrowing.status !== "approved") {
      throw new BorrowingStatusTransitionError("approved", borrowing.status);
    }

    const dueAtDate = new Date(dueAt);
    if (Number.isNaN(dueAtDate.getTime()) || dueAtDate <= new Date()) {
      throw new BorrowingDueDateError();
    }

    try {
      const checkedOut = await boardGameBorrowingsRepository.checkout(borrowingId, dueAt);
      invalidatePublicDataSafely("popularGames");
      return checkedOut;
    } catch (error) {
      return rethrowBorrowingTransactionError(error);
    }
  },

  /**
   * 歸還：借用紀錄改為 returned，桌遊狀態改回 available。
   */
  returnBorrowing: async (borrowingId: BoardGameBorrowingId) => {
    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new BorrowingNotFoundError();
    if (borrowing.status !== "borrowed") {
      throw new BorrowingStatusTransitionError("borrowed", borrowing.status);
    }

    try {
      const returned = await boardGameBorrowingsRepository.returnBorrowing(borrowingId);
      // completed count 不變，但首頁卡片的桌遊可借狀態會由 borrowed 變回 available。
      invalidatePublicDataSafely("popularGames");
      return returned;
    } catch (error) {
      return rethrowBorrowingTransactionError(error);
    }
  },

  updateBorrowingDueDate: async (
    borrowingId: BoardGameBorrowingId,
    dueAt: string,
  ) => {
    const dueAtDate = new Date(dueAt);
    if (Number.isNaN(dueAtDate.getTime()) || dueAtDate <= new Date()) {
      throw new BorrowingDueDateError();
    }

    const updated = await boardGameBorrowingsRepository.updateDueAtIfBorrowed(
      borrowingId,
      dueAt,
    );
    if (updated) return updated;

    const borrowing = await boardGameBorrowingsRepository.findById(borrowingId);
    if (!borrowing) throw new BorrowingNotFoundError();
    throw new BorrowingStatusTransitionError("borrowed", borrowing.status);
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

  countBoardGamesByCategoryIds: async (categoryIds: string[]): Promise<Record<string, number>> => {
    return boardGamesRepository.countByCategoryIds(categoryIds);
  },

  countBoardGamesByLocationId: async (locationId: string): Promise<number> => {
    return boardGamesRepository.countByLocationId(locationId);
  },

  countBoardGamesByLocationIds: async (locationIds: string[]): Promise<Record<string, number>> => {
    return boardGamesRepository.countByLocationIds(locationIds);
  },

  /**
   * 依狀態計算借用紀錄數量（供管理後台總覽統計使用）。
   */
  countOverdueBorrowings: async (): Promise<number> => {
    return boardGameBorrowingsRepository.countByStatus("borrowed", new Date().toISOString());
  },

  countBorrowingsByStatus: async (status: BorrowingStatus): Promise<number> => {
    return boardGameBorrowingsRepository.countByStatus(status);
  },
};


function takeDashboardBorrowings<T>(groups: T[][], limit: number) {
  const selected: T[] = [];

  for (const group of groups) {
    for (const borrowing of group) {
      if (selected.length === limit) return selected;
      selected.push(borrowing);
    }
  }

  return selected;
}
