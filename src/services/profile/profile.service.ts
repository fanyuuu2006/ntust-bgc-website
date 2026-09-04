import "server-only";

import { academicYearsRepository } from "@/repositories/academic-years.repository";
import { membershipsRepository } from "@/repositories/memberships.repository";
import { officerPositionsRepository } from "@/repositories/officer-positions.repository";
import type {
  AcademicYear,
  Membership,
  MembershipStatus,
  OfficerPosition,
  UUID,
} from "@/types/database";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";

const PROFILE_IDENTITY_PAGE_SIZE = 100;
const ESTABLISHED_MEMBERSHIP_STATUSES: MembershipStatus[] = [
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

export type ProfileClubContext = {
  currentMembership: MembershipWithAcademicYear | null;
  hasMembershipHistory: boolean;
  joinedAcademicYear: string | null;
  identityBadges: ProfileIdentityBadge[];
};

type OfficerPositionWithAcademicYear = OfficerPosition & {
  academic_year: AcademicYear | null;
};

async function findAllMembershipsByUserId(userId: UUID): Promise<Membership[]> {
  const firstPage = await membershipsRepository.findManyByUserId(userId, {
    page: 1,
    pageSize: PROFILE_IDENTITY_PAGE_SIZE,
    orderBy: "joined_at",
    orderDirection: "desc",
  });
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
      membershipsRepository.findManyByUserId(userId, {
        page: index + 2,
        pageSize: PROFILE_IDENTITY_PAGE_SIZE,
        orderBy: "joined_at",
        orderDirection: "desc",
      }),
    ),
  );

  return [
    ...firstPage.data,
    ...remainingPages.flatMap((page) => page.data),
  ];
}

async function findAllOfficerPositionsByUserId(
  userId: UUID,
): Promise<OfficerPosition[]> {
  const firstPage = await officerPositionsRepository.findManyByUserId(userId, {
    page: 1,
    pageSize: PROFILE_IDENTITY_PAGE_SIZE,
    orderDirection: "desc",
  });
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
      officerPositionsRepository.findManyByUserId(userId, {
        page: index + 2,
        pageSize: PROFILE_IDENTITY_PAGE_SIZE,
        orderDirection: "desc",
      }),
    ),
  );

  return [
    ...firstPage.data,
    ...remainingPages.flatMap((page) => page.data),
  ];
}

function compareAcademicYear(
  left: { academic_year: AcademicYear | null },
  right: { academic_year: AcademicYear | null },
  direction: "asc" | "desc",
) {
  const leftTime = left.academic_year
    ? new Date(left.academic_year.start_date).getTime()
    : Number.NEGATIVE_INFINITY;
  const rightTime = right.academic_year
    ? new Date(right.academic_year.start_date).getTime()
    : Number.NEGATIVE_INFINITY;

  return direction === "asc" ? leftTime - rightTime : rightTime - leftTime;
}

function buildIdentityBadges(
  memberships: MembershipWithAcademicYear[],
  officerPositions: OfficerPositionWithAcademicYear[],
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

export const profileService = {
  getClubContext: async (userId: UUID): Promise<ProfileClubContext> => {
    const [currentAcademicYear, memberships, officerPositions] =
      await Promise.all([
        academicYearsRepository.findCurrent(),
        findAllMembershipsByUserId(userId),
        findAllOfficerPositionsByUserId(userId),
      ]);
    const academicYearIds = [
      ...new Set([
        ...memberships.map((membership) => membership.academic_year_id),
        ...officerPositions.map((position) => position.academic_year_id),
      ]),
    ];
    const academicYears = await academicYearsRepository.findManyByIds(
      academicYearIds,
    );
    const academicYearsById = new Map(
      academicYears.map((academicYear) => [academicYear.id, academicYear]),
    );
    const membershipRecords = memberships.map((membership) => ({
      ...membership,
      academic_year:
        academicYearsById.get(membership.academic_year_id) ?? null,
    }));
    const officerRecords = officerPositions.map((position) => ({
      ...position,
      academic_year:
        academicYearsById.get(position.academic_year_id) ?? null,
    }));
    const establishedMemberships = membershipRecords.filter((membership) =>
      ESTABLISHED_MEMBERSHIP_STATUSES.includes(membership.status),
    );
    const joinedMembership = [...establishedMemberships].sort((left, right) =>
      compareAcademicYear(left, right, "asc"),
    )[0];
    const currentMembership = currentAcademicYear
      ? membershipRecords.find(
          (membership) =>
            membership.academic_year_id === currentAcademicYear.id,
        ) ?? null
      : null;

    return {
      currentMembership,
      hasMembershipHistory: establishedMemberships.length > 0,
      joinedAcademicYear: joinedMembership?.academic_year?.year ?? null,
      identityBadges: buildIdentityBadges(
        membershipRecords,
        officerRecords,
        currentAcademicYear?.id,
      ),
    };
  },
};
