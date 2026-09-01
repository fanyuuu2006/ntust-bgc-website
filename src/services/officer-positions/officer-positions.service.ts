import "server-only";

import { academicYearsRepository } from "@/repositories/academic-years.repository";
import {
  officerPositionsRepository,
  type FindManyOfficerPositionsOptions,
} from "@/repositories/officer-positions.repository";
import type { UUID } from "@/types/database";
import { usersRepository } from "@/repositories/users.repository";
import type { OfficerPositionWithAcademicYear } from "./officer-positions.types";

export const officerPositionsService = {
  listForAdmin: async (options: FindManyOfficerPositionsOptions = {}) => {
    const result = await officerPositionsRepository.findMany(options);
    const [users, academicYears] = await Promise.all([
      usersRepository.findManyByIds(result.data.map((item) => item.user_id)),
      academicYearsRepository.findManyByIds(result.data.map((item) => item.academic_year_id)),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const yearsById = new Map(academicYears.map((year) => [year.id, year]));
    return { ...result, data: result.data.flatMap((item) => { const user = usersById.get(item.user_id); if (!user) return []; return [{ ...item, user, academic_year: yearsById.get(item.academic_year_id) ?? null }]; }) };
  },

  createForAdmin: async (input: unknown) => {
    const data = parseCreateOfficerInput(input);
    if (!await usersRepository.findById(data.user_id)) throw new Error("找不到此使用者");
    if (!await academicYearsRepository.findById(data.academic_year_id)) throw new Error("找不到此學年度");
    return officerPositionsRepository.create(data);
  },

  updateForAdmin: async (id: string, input: unknown) => {
    const data = parseUpdateOfficerInput(input);
    const updated = await officerPositionsRepository.updateById(id, data);
    if (!updated) throw new Error("找不到此幹部職位");
    return updated;
  },

  deleteForAdmin: async (id: string) => {
    if (!await officerPositionsRepository.findById(id)) throw new Error("找不到此幹部職位");
    await officerPositionsRepository.deleteById(id);
  },
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

function parseCreateOfficerInput(input: unknown): { user_id: string; academic_year_id: string; title: string } {
  if (!input || typeof input !== "object") throw new Error("輸入資料格式不正確");
  const value = input as Record<string, unknown>;
  if (typeof value.user_id !== "string" || typeof value.academic_year_id !== "string" || typeof value.title !== "string" || !value.title.trim()) throw new Error("請完整填寫使用者、學年度與職位名稱");
  return { user_id: value.user_id, academic_year_id: value.academic_year_id, title: value.title.trim() };
}

function parseUpdateOfficerInput(input: unknown): { academic_year_id: string; title: string } {
  if (!input || typeof input !== "object") throw new Error("輸入資料格式不正確");
  const value = input as Record<string, unknown>;
  if (typeof value.academic_year_id !== "string" || typeof value.title !== "string" || !value.title.trim()) throw new Error("請完整填寫學年度與職位名稱");
  return { academic_year_id: value.academic_year_id, title: value.title.trim() };
}
