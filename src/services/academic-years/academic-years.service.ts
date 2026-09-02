import "server-only";

import {
  academicYearsRepository,
  type FindManyAcademicYearsOptions,
} from "@/repositories/academic-years.repository";
import { membershipsRepository } from "@/repositories/memberships.repository";
import { officerPositionsRepository } from "@/repositories/officer-positions.repository";
import { membershipRegisterKeysRepository } from "@/repositories/membership-register-keys.repository";
import { RepositoryError } from "@/repositories/shared/errors";
import type { AcademicYear } from "@/types/database";
import {
  createAcademicYearSchema,
  updateAcademicYearSchema,
} from "./academic-years.schema";

export class AcademicYearNotFoundError extends Error {
  constructor() {
    super("找不到此學年度");
    this.name = "AcademicYearNotFoundError";
  }
}
export class DuplicateAcademicYearError extends Error {
  constructor() {
    super("此學年度已存在");
    this.name = "DuplicateAcademicYearError";
  }
}
export class AcademicYearInUseError extends Error {
  constructor() {
    super("此學年度已有社員資格或幹部職位資料，無法刪除");
    this.name = "AcademicYearInUseError";
  }
}
export class AcademicYearCurrentDeleteForbiddenError extends Error {
  constructor() {
    super("目前學年度無法刪除，請先設定其他學年度為目前學年度");
    this.name = "AcademicYearCurrentDeleteForbiddenError";
  }
}

export const academicYearsService = {
  list: (): Promise<AcademicYear[]> => academicYearsRepository.findMany(),
  listForAdmin: (options: FindManyAcademicYearsOptions = {}) =>
    academicYearsRepository.findManyForAdmin(options),
  create: async (input: unknown) => {
    const data = createAcademicYearSchema.parse(input);
    if (await academicYearsRepository.existsByYear(data.year))
      throw new DuplicateAcademicYearError();
    return academicYearsRepository.create(data);
  },
  update: async (id: string, input: unknown) => {
    const data = updateAcademicYearSchema.parse(input);
    if (!(await academicYearsRepository.findById(id)))
      throw new AcademicYearNotFoundError();
    if (await academicYearsRepository.existsByYear(data.year, id))
      throw new DuplicateAcademicYearError();
    const updated = await academicYearsRepository.updateById(id, data);
    if (!updated) throw new AcademicYearNotFoundError();
    return updated;
  },
  setCurrent: async (id: string) => {
    if (!(await academicYearsRepository.findById(id)))
      throw new AcademicYearNotFoundError();
    try {
      return await academicYearsRepository.setCurrent(id);
    } catch (error) {
      if (isAcademicYearNotFoundRpcError(error))
        throw new AcademicYearNotFoundError();
      throw error;
    }
  },
  delete: async (id: string) => {
    const existing = await academicYearsRepository.findById(id);
    if (!existing) throw new AcademicYearNotFoundError();
    if (existing.is_current)
      throw new AcademicYearCurrentDeleteForbiddenError();
    const [membershipCount, officerCount, registerKeyCount] = await Promise.all([
      membershipsRepository.countByAcademicYearId(id),
      officerPositionsRepository.countByAcademicYearId(id),
      membershipRegisterKeysRepository.countByAcademicYearId(id),
    ]);
    if (membershipCount + officerCount + registerKeyCount > 0) throw new AcademicYearInUseError();
    await academicYearsRepository.deleteById(id);
  },
};

function isAcademicYearNotFoundRpcError(error: unknown): boolean {
  if (
    !(error instanceof RepositoryError) ||
    typeof error.cause !== "object" ||
    error.cause === null
  )
    return false;
  const cause = error.cause as { code?: unknown; message?: unknown };
  return cause.code === "P0001" && cause.message === "ACADEMIC_YEAR_NOT_FOUND";
}
