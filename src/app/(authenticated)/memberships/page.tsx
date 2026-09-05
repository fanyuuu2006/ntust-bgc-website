import { Suspense } from "react";
import { MembershipActivationForm } from "@/components/(authenticated)/memberships/MembershipActivationForm";
import { CurrentMembershipCard } from "@/components/(authenticated)/memberships/CurrentMembershipCard";
import { MembershipHistory } from "@/components/(authenticated)/memberships/MembershipHistory";
import { MembershipRecordsLoading } from "@/components/(authenticated)/memberships/MembershipRecordsLoading";
import {
  MembershipRecordsResults,
  type MembershipRecordsResultQuery,
} from "@/components/(authenticated)/memberships/MembershipRecordsResults";
import { MembershipRecordsToolbar } from "@/components/(authenticated)/memberships/MembershipRecordsToolbar";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/libs/auth";
import { membershipService } from "@/services/memberships/memberships.service";
import type { MembershipStatus, MembershipType } from "@/types/database";
import { buildQueryString } from "@/utils/url";

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
  const currentYearMembership = currentAcademicYear
    ? await membershipService.getMembershipByUserIdAndAcademicYearId(
        user.id,
        currentAcademicYear.id,
      )
    : null;
  const mayActivate = Boolean(currentAcademicYear) && (
    !currentYearMembership ||
    ["expired", "cancelled"].includes(currentYearMembership.status)
  );
  const resultQuery: MembershipRecordsResultQuery = {
    page: Number(queryInput.page ?? "1"),
    pageSize: Number(queryInput.pageSize ?? "12"),
    search: queryInput.search?.trim() || undefined,
    type: queryInput.type,
    status: queryInput.status,
    orderBy: "academic_year",
    orderDirection:
      queryInput.orderDirection === "asc"
        ? ("asc" as const)
          : ("desc" as const),
  };
  const resultQueryKey = buildQueryString(resultQuery);

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

      {!currentAcademicYear ? (
        <Card surface="subtle" className="p-5 sm:p-6">
          <h2 className="font-semibold text-(--text-primary)">
            目前尚未設定可入社的學年度
          </h2>
          <p className="mt-2 text-sm leading-6 text-(--text-muted)">
            社團尚未開放新的學年度入社；既有社員紀錄仍可在下方查看。
          </p>
        </Card>
      ) : mayActivate ? (
        <MembershipActivationForm
          academicYearLabel={currentAcademicYear?.year}
        />
      ) : null}

      <MembershipHistory
        controls={<MembershipRecordsToolbar query={resultQuery} />}
      >
        <Suspense
          key={resultQueryKey}
          fallback={<MembershipRecordsLoading />}
        >
          <MembershipRecordsResults
            userId={user.id}
            currentMembershipId={currentYearMembership?.id}
            query={resultQuery}
          />
        </Suspense>
      </MembershipHistory>
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
