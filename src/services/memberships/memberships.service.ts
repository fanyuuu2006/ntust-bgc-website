import "server-only";

import { academicYearsRepository } from "@/repositories/academic-years.repository";
import {
  membershipsRepository,
  type FindManyMembershipsOptions,
} from "@/repositories/memberships.repository";
import type { MembershipWithAcademicYear } from "./memberships.types";
import { buildPaginationResult } from "@/repositories/shared/pagination";

export const membershipService = {
  /**
   * 取得目前學年度的社員資格
   */
  getCurrentMembershipByUserId: async (
    userId: string,
  ): Promise<MembershipWithAcademicYear | null> => {
    const currentYear = await academicYearsRepository.findCurrent();

    // 沒有設定目前學年度（資料異常 / 尚未開學年），視為沒有目前社員資格
    if (!currentYear) {
      return null;
    }

    const membership =
      await membershipsRepository.findByUserIdAndAcademicYearId(
        userId,
        currentYear.id,
      );

    if (!membership) {
      return null;
    }

    return { ...membership, academic_year: currentYear };
  },

  /**
   * 取得使用者的社員紀錄（附帶學年度資料），依加入時間排序。
   * pageSize / orderDirection 由呼叫端決定，例如 Profile 頁想顯示
   * 最近 3 筆就傳 { pageSize: 3 }，管理頁想看全部就不傳。
   */
  getMembershipsByUserId: async (
    userId: string,
    options: FindManyMembershipsOptions = {},
  ): Promise<
    ReturnType<typeof buildPaginationResult<MembershipWithAcademicYear>>
  > => {
    const result = await membershipsRepository.findManyByUserId(userId, {
      orderBy: "joined_at",
      orderDirection: "desc",
      ...options,
    });

    const academicYearIds = [
      ...new Set(result.data.map((m) => m.academic_year_id)),
    ];
    const academicYears =
      await academicYearsRepository.findManyByIds(academicYearIds);

    const data = result.data.map((membership) => ({
      ...membership,
      academic_year:
        academicYears.find((year) => year.id === membership.academic_year_id) ??
        null,
    }));

    return { ...result, data };
  },

  /**
   * 判斷使用者是否為目前學年度的 active 社員
   */
  isCurrentActiveMember: async (userId: string): Promise<boolean> => {
    const currYear = await academicYearsRepository.findCurrent();
    if (!currYear) {
      return false;
    }
    const membership =
      await membershipsRepository.findByUserIdAndAcademicYearId(
        userId,
        currYear.id,
      );

    if (!membership) {
      return false;
    }

    return membership.status === "active";
  },

  /**
   * 使用者最早一筆社員紀錄對應的學年度（即「入社學年度」）
   * null 代表從未有過任何社員紀錄
   */
  getJoinedYear: async (userId: string): Promise<string | null> => {
    const memberships = await membershipsRepository.findManyByUserId(userId, {
      orderDirection: "asc",
      pageSize: 1,
    });

    if (memberships.data.length === 0) {
      return null;
    }

    const joinedMembership = memberships.data[0];
    const academicYear = await academicYearsRepository.findById(
      joinedMembership.academic_year_id,
    );

    return academicYear?.year ?? null;
  },
};
