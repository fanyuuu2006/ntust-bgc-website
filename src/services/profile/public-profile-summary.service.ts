import "server-only";
import { publicFootprintsRepository } from "@/repositories/public-footprints.repository";
import { academicYearsRepository } from "@/repositories/academic-years.repository";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { eventsService } from "@/services/events/events.service";
import { buildIdentityBadges, joinedAcademicYear } from "@/libs/profile-presentation";
import type { PublicProfile, PublicIdentityBadge } from "@/types/public-user";

export const publicProfileSummaryService = {
  /** 只由確認未註銷的公開頁編排呼叫；內部關聯 ID 不進入公開 DTO。 */
  getSummary: async (id: string): Promise<Pick<PublicProfile, "identityBadges" | "clubFootprint">> => {
    const [memberships, officers, year, totalBorrowedCount, attendedCount] = await Promise.all([
      publicFootprintsRepository.findMemberships(id), publicFootprintsRepository.findOfficers(id),
      academicYearsRepository.findCurrent(), boardGamesService.getTotalBorrowedCount(id),
      eventsService.getAttendedCountByCurrentAcademicYear(id),
    ]);
    const identityBadges: PublicIdentityBadge[] = buildIdentityBadges(memberships, officers, year?.id)
      .flatMap(badge => badge.category === "non-member" ? [] : [{ label: badge.label, category: badge.category }]);
    return { identityBadges, clubFootprint: { totalBorrowedCount, attendedCount, joinedAcademicYear: joinedAcademicYear(memberships) } };
  },
};
