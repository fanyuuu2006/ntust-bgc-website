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
   * 取得使用者所有社員紀錄（附帶各筆對應的學年度資料）
   *
   * 先一次撈出全部學年度做成 map，避免對每筆 membership
   * 各自打一次 academicYearsRepository.findById（N+1 query）。
   */
  getAllMembershipsByUserId: async (
    userId: string,
  ): Promise<MembershipWithAcademicYear[]> => {
    const memberships = await membershipsRepository.findManyByUserId(userId);

    if (memberships.length === 0) {
      return [];
    }

    const academicYears = await academicYearsRepository.findMany();
    const academicYearById = new Map(
      academicYears.map((year) => [year.id, year]),
    );

    return memberships.flatMap((membership) => {
      const academicYear = academicYearById.get(membership.academic_year_id);

      // 理論上不該發生（FK 保證存在），但資料異常時寧可濾掉也不要噴錯讓整頁掛掉
      if (!academicYear) {
        console.error(
          `[membershipService] membership ${membership.id} 找不到對應的 academic_year ${membership.academic_year_id}`,
        );
        return [];
      }

      return [{ ...membership, academic_year: academicYear }];
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
};
