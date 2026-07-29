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
 *
 * memberships / officerPositions 為「最近 N 筆」歷史紀錄（依時間新到舊排序），
 * 筆數上限見 usersService.getProfileData 中的 RECENT_RECORDS_LIMIT。
 */
export type UserProfileData = User & {
  profile: UserProfile | null;
  recentMemberships: MembershipWithAcademicYear[];
  recentOfficerPositions: OfficerPositionWithAcademicYear[];
};
