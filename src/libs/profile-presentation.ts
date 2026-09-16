import type { MembershipStatus } from "@/types/database";
export const ESTABLISHED_MEMBERSHIP_STATUSES: MembershipStatus[] = [
  "active",
  "expired",
];

export type ProfileIdentityBadgeCategory =
  | "current-membership"
  | "historical-membership"
  | "officer"
  | "non-member";

export type ProfileIdentityBadge = {
  id: string;
  label: string;
  category: ProfileIdentityBadgeCategory;
};

export type ProfileAcademicYear = { year: string; start_date: string };
export type BadgeMembership = { id: string; academic_year_id: string; status: MembershipStatus; academic_year: ProfileAcademicYear | null };
export type BadgeOfficer = { id: string; title: string; academic_year: ProfileAcademicYear | null };
function compareAcademicYear(
  left: { academic_year: ProfileAcademicYear | null },
  right: { academic_year: ProfileAcademicYear | null },
  direction: "asc" | "desc",
) {
  const leftDate = left.academic_year ? left.academic_year.start_date : "";
  const rightDate = right.academic_year ? right.academic_year.start_date : "";
  return direction === "asc"
    ? leftDate.localeCompare(rightDate)
    : rightDate.localeCompare(leftDate);
}

export function buildIdentityBadges(
  memberships: BadgeMembership[],
  officerPositions: BadgeOfficer[],
  currentAcademicYearId: string | null | undefined,
): ProfileIdentityBadge[] {
  const establishedMemberships = memberships.filter((membership) =>
    ESTABLISHED_MEMBERSHIP_STATUSES.includes(membership.status),
  );

  const currentMembership = establishedMemberships.find(
    (membership) =>
      membership.status === "active" &&
      membership.academic_year_id === currentAcademicYearId,
  );
  const membershipBadges = establishedMemberships
    .filter((membership) => membership.id !== currentMembership?.id)
    .sort((left, right) => compareAcademicYear(left, right, "desc"))
    .map((membership) => ({
      id: `membership:${membership.id}`,
      label: `${membership.academic_year?.year ?? "未知"} 社員`,
      category: "historical-membership" as const,
      academic_year: membership.academic_year,
    }));
  const officerBadges = officerPositions
    .sort((left, right) => compareAcademicYear(left, right, "desc"))
    .map((position) => ({
      id: `officer:${position.id}`,
      label: `${position.academic_year?.year ?? "未知"} ${position.title}`,
      category: "officer" as const,
      academic_year: position.academic_year,
    }));
  const historicalBadges = [...officerBadges, ...membershipBadges].sort(
    (left, right) => {
      const academicYearOrder = compareAcademicYear(left, right, "desc");
      if (academicYearOrder !== 0) return academicYearOrder;
      if (left.category === right.category) return 0;
      return left.category === "officer" ? -1 : 1;
    },
  );

  return [
    ...(currentMembership
      ? [{
          id: `membership:${currentMembership.id}`,
          label: `${currentMembership.academic_year?.year ?? "未知"} 社員`,
          category: "current-membership" as const,
        }]
      : establishedMemberships.length === 0
        ? [{ id: "non-member", label: "非社員", category: "non-member" as const }]
        : []),
    ...historicalBadges.map((badge) => ({
      id: badge.id,
      label: badge.label,
      category: badge.category,
    })),
  ];
}

/** 公私 Profile 共用加入學年度語意：有效／過期資格中學年度起日最早者。 */
export function joinedAcademicYear(memberships: BadgeMembership[]): string | null {
 return [...memberships].filter(m => ESTABLISHED_MEMBERSHIP_STATUSES.includes(m.status)).sort((a,b)=>compareAcademicYear(a,b,"asc"))[0]?.academic_year?.year ?? null;
}
