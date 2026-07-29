import "server-only";

import { eventAttendancesRepository } from "@/repositories/event-attendances.repository";

/**
 * event-attendances service
 *
 * 「簽到次數」只算 present，不計入 absent / late，
 * 由這裡統一定義，避免呼叫端各自 filter 狀態。
 */
export const eventAttendancesService = {
  getAttendedCount: async (userId: string): Promise<number> => {
    return eventAttendancesRepository.countByUserId(userId, [
      "present",
      "late",
    ]);
  },
};
