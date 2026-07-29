import "server-only";

import { academicYearsRepository } from "@/repositories/academic-years.repository";
import { membershipsRepository } from "@/repositories/memberships.repository";
import { MembershipWithAcademicYear } from "./memberships.types";

/**
 * membership service
 *
 * 「目前社員」是跨 memberships / academic_years 兩張表才能定義的規則，
 * 屬於業務邏輯，不屬於任何單一 repository，所以放在 service layer。
 */
export const membershipService = {
  /**
   * 取得使用者「目前學年度」的社員資格（附帶學年度資料）
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
   * 取得使用者所有社員紀錄（依加入時間新到舊排序，附帶各筆對應的學年度資料）
   */
  getAllMembershipsByUserId: async (
    userId: string,
  ): Promise<MembershipWithAcademicYear[]> => {
    return membershipsRepository.findManyByUserId(userId, { order: "desc" });
  },

  /**
   * 取得使用者最近 N 筆社員紀錄（依加入時間新到舊排序，附帶學年度資料）
   *
   * @param limit 要取的筆數（例如個人頁只想顯示最近 3 筆）
   */
  getRecentMembershipsByUserId: async (
    userId: string,
    limit: number,
  ): Promise<MembershipWithAcademicYear[]> => {
    return membershipsRepository.findManyByUserId(userId, {
      order: "desc",
      limit,
    });
  },

  /**
   * 檢查使用者是否為「目前學年度」的 active 社員
   */
  isCurrentActiveMember: async (userId: string): Promise<boolean> => {
    const currentYear = await academicYearsRepository.findCurrent();

    if (!currentYear) {
      return false;
    }

    const membership =
      await membershipsRepository.findByUserIdAndAcademicYearId(
        userId,
        currentYear.id,
      );

    return membership?.status === "active";
  },

  /**
   * 使用者最早一筆社員紀錄對應的學年度（即「入社學年度」）。
   * null 代表從未有過任何社員紀錄。
   */
  getJoinedYear: async (userId: string): Promise<string | null> => {
    const earliest = await membershipsRepository.findManyByUserId(userId, {
      order: "asc",
      limit: 1,
    });

    return earliest[0]?.academic_year.year ?? null;
  },
};
