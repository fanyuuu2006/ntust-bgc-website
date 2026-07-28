import {
  AcademicYear,
  OfficerPosition,
  User,
  UserProfile,
} from "@/types/database";
import { MembershipWithAcademicYear } from "../memberships/memberships.types";

export type OfficerPositionWithAcademicYear = OfficerPosition & {
  academic_year: AcademicYear;
};

/**
 * User 所有相關資料
 */
export type UserProfileData = User & {
  profile: UserProfile | null;
  membership: MembershipWithAcademicYear | null;
  officerPositions: OfficerPositionWithAcademicYear[];
};
