import { getCurrentAcademicYear } from "@/services/academic-years/current-academic-year";
import { buildIdentityBadges, joinedAcademicYear, ESTABLISHED_MEMBERSHIP_STATUSES } from "@/libs/profile-presentation";
import type { ProfileIdentityBadge } from "@/libs/profile-presentation";
export type { ProfileIdentityBadge, ProfileIdentityBadgeCategory } from "@/libs/profile-presentation";
import "server-only";

import { academicYearsRepository } from "@/repositories/academic-years.repository";
import { membershipsRepository } from "@/repositories/memberships.repository";
import { officerPositionsRepository } from "@/repositories/officer-positions.repository";
import type {
  Membership,
  OfficerPosition,
  UUID,
} from "@/types/database";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";

const PROFILE_IDENTITY_PAGE_SIZE = 100;
export type ProfileClubContext = {
  currentMembership: MembershipWithAcademicYear | null;
  hasMembershipHistory: boolean;
  joinedAcademicYear: string | null;
  identityBadges: ProfileIdentityBadge[];
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

export const profileService = {
  getClubContext: async (userId: UUID): Promise<ProfileClubContext> => {
    const [currentAcademicYear, memberships, officerPositions] =
      await Promise.all([
        getCurrentAcademicYear(),
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
    const currentMembership = currentAcademicYear
      ? membershipRecords.find(
          (membership) =>
            membership.academic_year_id === currentAcademicYear.id,
        ) ?? null
      : null;

    return {
      currentMembership,
      hasMembershipHistory: membershipRecords.some(record => ESTABLISHED_MEMBERSHIP_STATUSES.includes(record.status)),
      joinedAcademicYear: joinedAcademicYear(membershipRecords),
      identityBadges: buildIdentityBadges(
        membershipRecords,
        officerRecords,
        currentAcademicYear?.id,
      ),
    };
  },
};
