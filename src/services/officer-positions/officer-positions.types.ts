import type { OfficerPosition, AcademicYear } from "@/types/database";
import type { AdminUserIdentityRow } from "@/repositories/users.repository";

export type AdminOfficerPosition = OfficerPosition & {
  academic_year: AcademicYear | null;
  user: AdminUserIdentityRow;
  user_profile: {
    real_name: string;
    student_id: string | null;
  } | null;
};

export type OfficerPositionWithAcademicYear = OfficerPosition & {
  academic_year: AcademicYear | null;
};
