import "server-only";

import {
  eventsRepository,
  FindManyEventsOptions,
} from "@/repositories/events.repository";
import { attendanceInputSchema, attendanceUpdateSchema, createEventSchema, updateEventSchema } from "./events.schema";
import { usersRepository } from "@/repositories/users.repository";
import { userProfilesRepository } from "@/repositories/user-profiles.repository";
import {
  EventNotFoundError,
  SelfCheckInAlreadyCompletedError,
  SelfCheckInClosedError,
  SelfCheckInMembershipRequiredError,
} from "./events.errors";
import { academicYearsRepository } from "@/repositories/academic-years.repository";
import {
  FindManyEventAttendancesOptions,
  eventAttendancesRepository,
} from "@/repositories/event-attendances.repository";
import { AttendanceStatus, EventAttendanceId } from "@/types/database";
import { membershipService } from "@/services/memberships/memberships.service";
import { RepositoryError } from "@/repositories/shared/errors";
import type { SelfCheckInEvent } from "./events.types";
/**
 * 「簽到次數」計入 present 與 late，不計入 absent，
 * 由這裡統一定義，避免呼叫端各自 filter 狀態。
 */
const COUNTED_STATUSES: AttendanceStatus[] = ["present", "late"];

function resolveCheckInWindow(
  opensAt: string | null,
  closesAt: string | null,
) {
  if ((opensAt === null) !== (closesAt === null)) {
    throw new Error("簽到開始與截止時間必須同時設定");
  }

  if (opensAt && closesAt && new Date(opensAt) > new Date(closesAt)) {
    throw new Error("簽到截止時間不得早於簽到開始時間");
  }

  return { check_in_opens_at: opensAt, check_in_closes_at: closesAt };
}

function isUniqueViolation(error: unknown): boolean {
  const source = error instanceof RepositoryError ? error.cause : error;
  return (
    typeof source === "object" &&
    source !== null &&
    "code" in source &&
    source.code === "23505"
  );
}

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
    return eventsRepository.create({
      ...data,
      ...resolveCheckInWindow(
        data.check_in_opens_at ?? null,
        data.check_in_closes_at ?? null,
      ),
    });
  },

  updateEvent: async (id: string, payload: unknown) => {
    const data = updateEventSchema.parse(payload);
    const current = await eventsRepository.findById(id);

    if (!current) {
      throw new EventNotFoundError();
    }

    const hasCheckInWindowChange =
      data.check_in_opens_at !== undefined ||
      data.check_in_closes_at !== undefined;
    const checkInWindow = hasCheckInWindowChange
      ? resolveCheckInWindow(
          data.check_in_opens_at === undefined
            ? current.check_in_opens_at
            : data.check_in_opens_at,
          data.check_in_closes_at === undefined
            ? current.check_in_closes_at
            : data.check_in_closes_at,
        )
      : {};
    const updated = await eventsRepository.updateById(id, {
      ...data,
      ...checkInWindow,
    });

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

  getSelfCheckInEventsForUser: async (
    userId: string,
  ): Promise<SelfCheckInEvent[]> => {
    const events = await eventsRepository.findOpenForSelfCheckIn(
      new Date().toISOString(),
    );
    const attendances = await eventAttendancesRepository.findManyByUserIdAndEventIds(
      userId,
      events.map((event) => event.id),
    );
    const attendancesByEventId = new Map(
      attendances.map((attendance) => [attendance.event_id, attendance]),
    );

    return events.map((event) => ({
      event,
      attendance: attendancesByEventId.get(event.id) ?? null,
    }));
  },

  selfCheckIn: async (userId: string, eventId: string) => {
    const [event, isCurrentMember, existing] = await Promise.all([
      eventsRepository.findById(eventId),
      membershipService.isCurrentActiveMember(userId),
      eventAttendancesRepository.findByUserIdAndEventId(userId, eventId),
    ]);

    if (!event) throw new EventNotFoundError();
    if (!isCurrentMember) throw new SelfCheckInMembershipRequiredError();
    if (existing) throw new SelfCheckInAlreadyCompletedError();

    const now = new Date();
    const opensAt = event.check_in_opens_at
      ? new Date(event.check_in_opens_at)
      : null;
    const closesAt = event.check_in_closes_at
      ? new Date(event.check_in_closes_at)
      : null;

    if (!opensAt || !closesAt || now < opensAt || now > closesAt) {
      throw new SelfCheckInClosedError();
    }

    try {
      return await eventAttendancesRepository.create({
        user_id: userId,
        event_id: eventId,
        status: "present",
        attended_at: now.toISOString(),
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new SelfCheckInAlreadyCompletedError();
      }
      throw error;
    }
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

  listAttendancesForAdmin: async (eventId: string) => {
    const result = await eventAttendancesRepository.findMany({ event_id: eventId, pageSize: 100, orderDirection: "asc" });
    const userIds = result.data.map((item) => item.user_id);
    const [users, profiles] = await Promise.all([usersRepository.findManyByIds(userIds), userProfilesRepository.findManyByUserIds(userIds)]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const profilesById = new Map(profiles.map((profile) => [profile.user_id, profile]));
    return result.data.flatMap((item) => { const user = usersById.get(item.user_id); return user ? [{ ...item, user, profile: profilesById.get(user.id) ?? null }] : []; });
  },

  createAttendanceForAdmin: async (eventId: string, input: unknown) => {
    const data = attendanceInputSchema.parse(input);
    const [event, user, existing] = await Promise.all([eventsRepository.findById(eventId), usersRepository.findById(data.user_id), eventAttendancesRepository.findByUserIdAndEventId(data.user_id, eventId)]);
    if (!event) throw new EventNotFoundError();
    if (!user) throw new Error("找不到使用者");
    if (existing) throw new Error("此使用者已有該活動的簽到紀錄");
    return eventAttendancesRepository.create({ user_id: data.user_id, event_id: eventId, status: data.status, attended_at: data.status === "absent" ? null : data.attended_at ?? new Date().toISOString() });
  },

  updateAttendanceForAdmin: async (attendanceId: EventAttendanceId, input: unknown) => {
    const data = attendanceUpdateSchema.parse(input);
    const current = await eventAttendancesRepository.findById(attendanceId);
    if (!current) throw new Error("找不到簽到紀錄");
    const updated = await eventAttendancesRepository.updateById(attendanceId, { status: data.status, attended_at: data.status === "absent" ? null : data.attended_at ?? current.attended_at ?? new Date().toISOString() });
    if (!updated) throw new Error("更新簽到紀錄失敗");
    return updated;
  },

  deleteAttendanceForAdmin: async (attendanceId: EventAttendanceId) => {
    if (!await eventAttendancesRepository.findById(attendanceId)) throw new Error("找不到簽到紀錄");
    await eventAttendancesRepository.deleteById(attendanceId);
  },
};
