import { MembershipActivationForm } from "@/components/(authenticated)/memberships/MembershipActivationForm";
import { CurrentMembershipCard } from "@/components/(authenticated)/memberships/CurrentMembershipCard";
import { MembershipHistory } from "@/components/(authenticated)/memberships/MembershipHistory";
import { MembershipRecordsToolbar } from "@/components/(authenticated)/memberships/MembershipRecordsToolbar";
import { Pagination } from "@/components/Pagination/Pagination";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/libs/auth";
import { membershipService } from "@/services/memberships/memberships.service";
import type { MembershipStatus, MembershipType } from "@/types/database";

type MembershipSearchParams = {
  page?: string | string[];
  pageSize?: string | string[];
  search?: string | string[];
  type?: string | string[];
  status?: string | string[];
  orderBy?: string | string[];
  orderDirection?: string | string[];
};

type MembershipsPageProps = {
  searchParams: Promise<MembershipSearchParams>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MembershipsPage({
  searchParams,
}: MembershipsPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const type = firstValue(params.type);
  const status = firstValue(params.status);
  const orderBy = firstValue(params.orderBy);
  const orderDirection = firstValue(params.orderDirection);
  const queryInput = {
    page: normalizePositiveInteger(firstValue(params.page)),
    pageSize: normalizePositiveInteger(firstValue(params.pageSize)),
    search: firstValue(params.search),
    type: isMembershipType(type) ? type : undefined,
    status: isMembershipStatus(status) ? status : undefined,
    orderBy: orderBy === "academic_year" ? "academic_year" : undefined,
    orderDirection:
      orderDirection === "asc"
        ? "asc"
        : orderDirection === "desc"
          ? "desc"
          : undefined,
  };
  const academicYears = await membershipService.listAcademicYears();
  const currentAcademicYear = academicYears.find((year) => year.is_current);
  const [currentYearMembership, membershipRecords] = await Promise.all([
    currentAcademicYear
      ? membershipService.getMembershipByUserIdAndAcademicYearId(
          user.id,
          currentAcademicYear.id,
        )
      : Promise.resolve(null),
    membershipService.listMembershipRecordsByUserId(user.id, queryInput),
  ]);
  const mayActivate =
    !currentYearMembership ||
    ["expired", "cancelled"].includes(currentYearMembership.status);
  const query = {
    search: queryInput.search?.trim() || undefined,
    type: queryInput.type,
    status: queryInput.status,
    orderDirection:
      queryInput.orderDirection === "asc"
        ? ("asc" as const)
        : ("desc" as const),
  };

  return (
    <section className="container max-w-5xl space-y-8 py-8">
      <PageHeader
        eyebrow="社員"
        title="社員資格"
        description="查看本學年度的社員資格與完整社員紀錄。"
      />

      {currentYearMembership ? (
        <CurrentMembershipCard membership={currentYearMembership} />
      ) : null}

      {mayActivate ? (
        <MembershipActivationForm
          academicYearLabel={currentAcademicYear?.year}
        />
      ) : null}

      <MembershipHistory
        memberships={membershipRecords.data}
        currentMembershipId={currentYearMembership?.id}
        controls={<MembershipRecordsToolbar query={query} />}
        pagination={
          <Pagination
            page={membershipRecords.page}
            pageSize={membershipRecords.pageSize}
            total={membershipRecords.total}
            totalPages={membershipRecords.totalPages}
            basePath="/memberships"
            query={{
              search: query.search,
              type: query.type,
              status: query.status,
              orderBy: "academic_year",
              orderDirection: query.orderDirection,
            }}
            showPageSize={false}
          />
        }
      />
    </section>
  );
}

function isMembershipType(value: string | undefined): value is MembershipType {
  return value === "annual" || value === "lifetime";
}

function isMembershipStatus(
  value: string | undefined,
): value is MembershipStatus {
  return ["pending", "active", "expired", "suspended", "cancelled"].includes(
    value ?? "",
  );
}

function normalizePositiveInteger(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : undefined;
}
