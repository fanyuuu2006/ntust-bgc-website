import type {
  AcademicYear,
  Membership,
  MembershipRegisterKey,
  User,
  UserProfile,
} from "@/types/database";

/**
 * 社員資格紀錄本身不等於目前是否可使用社員服務。
 * 這個純 domain helper 是所有「當前社員」判斷的唯一規則來源。
 */
export type MembershipQualification =
  | "current_member"
  | "historical_member"
  | null;

export function getMembershipQualification(
  membership: Pick<Membership, "type" | "status" | "academic_year_id">,
  currentAcademicYearId: string | null | undefined,
): MembershipQualification {
  if (membership.status !== "active") return null;

  return membership.academic_year_id === currentAcademicYearId
    ? "current_member"
    : "historical_member";
}

export function isCurrentActiveMembership(
  membership: Pick<Membership, "type" | "status" | "academic_year_id">,
  currentAcademicYearId: string | null | undefined,
): boolean {
  const qualification = getMembershipQualification(
    membership,
    currentAcademicYearId,
  );
  return qualification === "current_member";
}

export type UserMembershipEligibility = {
  hasCurrentMembership: boolean;
};


export type MembershipWithAcademicYear = Membership & {
  academic_year: AcademicYear | null;
};

export type MembershipRegisterKeyWithAcademicYear = MembershipRegisterKey & {
  academic_year: AcademicYear | null;
  created_by_user: User | null;
  claimed_membership: MembershipWithAcademicYear | null;
};

export type AdminMembership = MembershipWithAcademicYear & {
  user: User;
  user_profile: UserProfile | null;
};
