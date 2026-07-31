import type { OfficerPosition, AcademicYear } from "@/types/database";

export type OfficerPositionWithAcademicYear = OfficerPosition & {
  academic_year: AcademicYear | null;
};
