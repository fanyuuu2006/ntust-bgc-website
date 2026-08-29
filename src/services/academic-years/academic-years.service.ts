import "server-only";

import {
  academicYearsRepository,
  type FindManyAcademicYearsOptions,
} from "@/repositories/academic-years.repository";
import { membershipsRepository } from "@/repositories/memberships.repository";
import { officerPositionsRepository } from "@/repositories/officer-positions.repository";
import type { AcademicYear } from "@/types/database";
import { createAcademicYearSchema, updateAcademicYearSchema } from "./academic-years.schema";

export class AcademicYearNotFoundError extends Error { constructor() { super("找不到此學年度"); this.name = "AcademicYearNotFoundError"; } }
export class DuplicateAcademicYearError extends Error { constructor() { super("此學年度已存在"); this.name = "DuplicateAcademicYearError"; } }
export class AcademicYearInUseError extends Error { constructor() { super("此學年度已有社員資格或幹部職位資料，無法刪除"); this.name = "AcademicYearInUseError"; } }

export const academicYearsService = {
  list: (): Promise<AcademicYear[]> => academicYearsRepository.findMany(),
  listForAdmin: (options: FindManyAcademicYearsOptions = {}) =>
    academicYearsRepository.findManyForAdmin(options),
  create: async (input: unknown) => {
    const data = createAcademicYearSchema.parse(input);
    if (await academicYearsRepository.existsByYear(data.year)) throw new DuplicateAcademicYearError();
    return academicYearsRepository.create(data);
  },
  update: async (id: string, input: unknown) => {
    const data = updateAcademicYearSchema.parse(input);
    if (!await academicYearsRepository.findById(id)) throw new AcademicYearNotFoundError();
    if (await academicYearsRepository.existsByYear(data.year, id)) throw new DuplicateAcademicYearError();
    const updated = await academicYearsRepository.updateById(id, data);
    if (!updated) throw new AcademicYearNotFoundError();
    return updated;
  },
  setCurrent: async (id: string) => {
    if (!await academicYearsRepository.findById(id)) throw new AcademicYearNotFoundError();
    return academicYearsRepository.setCurrent(id);
  },
  delete: async (id: string) => {
    const existing = await academicYearsRepository.findById(id);
    if (!existing) throw new AcademicYearNotFoundError();
    const [membershipCount, officerCount] = await Promise.all([membershipsRepository.countByAcademicYearId(id), officerPositionsRepository.countByAcademicYearId(id)]);
    if (membershipCount + officerCount > 0) throw new AcademicYearInUseError();
    await academicYearsRepository.deleteById(id);
  },
};
