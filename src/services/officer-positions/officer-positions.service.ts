import "server-only";

import { academicYearsRepository } from "@/repositories/academic-years.repository";
import {
  officerPositionsRepository,
  type FindManyOfficerPositionsOptions,
} from "@/repositories/officer-positions.repository";
import type { UUID } from "@/types/database";
import type { OfficerPositionWithAcademicYear } from "./officer-positions.types";

export const officerPositionsService = {
  /**
   * 取得使用者的幹部職位紀錄（附帶學年度資料），依 created_at 排序。
   * pageSize / orderDirection 由呼叫端決定，例如 Profile 頁想顯示
   * 最近 3 筆就傳 { pageSize: 3 }，管理頁想看全部就不傳。
   */
  getPositionsByUserId: async (
    userId: UUID,
    options: FindManyOfficerPositionsOptions = {},
  ) => {
    const result = await officerPositionsRepository.findManyByUserId(
      userId,
      options,
    );

    const academicYearIds = [
      ...new Set(result.data.map((p) => p.academic_year_id)),
    ];
    const academicYears =
      academicYearIds.length < 1
        ? []
        : await academicYearsRepository.findManyByIds(academicYearIds);

    const data = result.data.map((position) => ({
      ...position,
      academic_year:
        academicYears.find((year) => year.id === position.academic_year_id) ??
        null,
    }));

    return { ...result, data };
  },

  /**
   * 取得使用者「目前學年度」的幹部職位（附帶學年度資料）。
   * 依 academic_years.is_current 判斷目前學年度，不可 hardcode 學年度 ID。
   * 沒有設定目前學年度，或該使用者非現任幹部，皆回傳 []。
   */
  getCurrentPositionsByUserId: async (
    userId: UUID,
  ): Promise<OfficerPositionWithAcademicYear[]> => {
    const currentYear = await academicYearsRepository.findCurrent();

    if (!currentYear) {
      return [];
    }

    const positions =
      await officerPositionsRepository.findManyByUserIdAndAcademicYearId(
        userId,
        currentYear.id,
      );

    // currentYear 已經查出來了，不需要再批次查一次 academic_years
    return positions.map((position) => ({
      ...position,
      academic_year: currentYear,
    }));
  },

  /**
   * 判斷使用者是否為目前學年度的現任幹部
   */
  isCurrentOfficer: async (userId: UUID): Promise<boolean> => {
    const positions =
      await officerPositionsService.getCurrentPositionsByUserId(userId);
    return positions.length > 0;
  },

  hasEverBeenOfficer: async (userId: UUID): Promise<boolean> => {
    return await officerPositionsRepository.existsByUserId(userId);
  },
};
