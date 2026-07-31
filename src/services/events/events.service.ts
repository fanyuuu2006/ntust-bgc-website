import "server-only";

import {
  eventsRepository,
  FindManyEventsOptions,
} from "@/repositories/events.repository";
import { createEventSchema, updateEventSchema } from "./events.schema";
import { EventNotFoundError } from "./events.errors";
import { academicYearsRepository } from "@/repositories/academic-years.repository";
import {
  FindManyEventAttendancesOptions,
  eventAttendancesRepository,
} from "@/repositories/event-attendances.repository";
import { AttendanceStatus } from "@/types/database";
/**
 * 「簽到次數」計入 present 與 late，不計入 absent，
 * 由這裡統一定義，避免呼叫端各自 filter 狀態。
 */
const COUNTED_STATUSES: AttendanceStatus[] = ["present", "late"];

export const eventsService = {
  getEvents: async (options: FindManyEventsOptions = {}) => {
    return eventsRepository.findMany(options);
  },

  getUpcomingEvents: async (limit?: number) => {
    return eventsRepository.findUpcoming(limit);
  },

  getEventById: async (id: string) => {
    return eventsRepository.findById(id);
  },

  createEvent: async (payload: unknown) => {
    const data = createEventSchema.parse(payload);
    return eventsRepository.create(data);
  },

  updateEvent: async (id: string, payload: unknown) => {
    const data = updateEventSchema.parse(payload);
    const updated = await eventsRepository.updateById(id, data);

    if (!updated) {
      throw new EventNotFoundError();
    }

    return updated;
  },

  deleteEvent: async (id: string) => {
    const existing = await eventsRepository.findById(id);

    if (!existing) {
      throw new EventNotFoundError();
    }

    await eventsRepository.deleteById(id);
  },

  getAttendedCountByUserId: async (userId: string): Promise<number> => {
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

  /**
   * 查詢使用者的簽到紀錄（分頁），供個人資料頁「簽到紀錄」使用。
   */
  getAttendancesByUserId: async (
    userId: string,
    options: Omit<FindManyEventAttendancesOptions, "user_id"> = {},
  ) => {
    return eventAttendancesRepository.findMany({
      user_id: userId,
      ...options,
    });
  },
};
