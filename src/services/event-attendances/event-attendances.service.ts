import "server-only";

import { academicYearsRepository } from "@/repositories/academic-years.repository";
import { eventAttendancesRepository } from "@/repositories/event-attendances.repository";
import { AttendanceStatus } from "@/types/database";

/**
 * 「簽到次數」計入 present 與 late，不計入 absent，
 * 由這裡統一定義，避免呼叫端各自 filter 狀態。
 */
const COUNTED_STATUSES: AttendanceStatus[] = ["present", "late"];

export const eventAttendancesService = {
  getAttendedCount: async (userId: string): Promise<number> => {
    return eventAttendancesRepository.countByUserId(userId, COUNTED_STATUSES);
  },

  getAttendedCountByAcademicYear: async (
    userId: string,
    academicYearId: string,
  ): Promise<number> => {
    return eventAttendancesRepository.countByUserIdAndAcademicYear(
      userId,
      academicYearId,
      COUNTED_STATUSES,
    );
  },

  getAttendedCountByCurrentAcademicYear: async (
    userId: string,
  ): Promise<number> => {
    const currentAcademicYear = await academicYearsRepository.findCurrent();

    if (!currentAcademicYear) {
      return 0;
    }

    return eventAttendancesRepository.countByUserIdAndAcademicYear(
      userId,
      currentAcademicYear.id,
      COUNTED_STATUSES,
    );
  },
};
