import { User, UserProfile } from "@/types/database";
import { MembershipWithAcademicYear } from "../memberships/memberships.types";
import { OfficerPositionWithAcademicYear } from "@/repositories/officer-positions.repository";

/**
 * User 所有相關資料
 */
export type UserProfileData = User & {
  profile: UserProfile | null;
  membership: MembershipWithAcademicYear | null;
  officerPositions: OfficerPositionWithAcademicYear[];
};
