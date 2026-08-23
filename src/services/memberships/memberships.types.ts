import type {
  AcademicYear,
  Membership,
  MembershipRegisterKey,
  User,
  UserProfile,
} from "@/types/database";

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
