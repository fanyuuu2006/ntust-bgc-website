import "server-only";

import { boardGameBorrowingsRepository } from "@/repositories/board-game-borrowings.repository";

/**
 * board-game-borrowings service
 *
 * 「累計借用」與「目前借用中」的定義（哪些狀態算數）
 * 屬於這個 domain 的業務規則，由這裡統一定義，
 * 而不是散落在各個呼叫端各自 filter 狀態。
 */
export const boardGameBorrowingsService = {
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
  getActiveBorrowedCount: async (userId: string): Promise<number> => {
    return boardGameBorrowingsRepository.countByUserId(userId, ["borrowed"]);
  },
};
