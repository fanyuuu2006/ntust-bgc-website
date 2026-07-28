import { AcademicYear, Membership } from "@/types/database";

export type MembershipWithAcademicYear = Membership & {
  academic_year: AcademicYear;
};
