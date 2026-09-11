import { getLatestVerificationForAdmin } from "@/services/email-verification/email-verification-operations.service";
import { getAdminReturnPath } from "@/utils/admin-return";
import { notFound } from "next/navigation";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import {
  MemberStatusBadge,
  MembershipTypeLabel,
} from "@/components/(admin)/admin/memberships/MemberStatusBadge";
import { UserProfileEditButton } from "@/components/(admin)/admin/users/UserProfileEditButton";
import { EmailVerificationBadge } from "@/components/(admin)/admin/users/EmailVerificationBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { usersService } from "@/services/users/users.service";
import { formatDateTime } from "@/utils/date";

const MISSING_VALUE = "尚未填寫";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { id } = await params;
  const returnTo = getAdminReturnPath((await searchParams).returnTo, "/admin/users");
  const user = await usersService.getUserForAdmin(id);

  if (!user) notFound();
  const verification = await getLatestVerificationForAdmin(id);

  return (
    <>
      <HeadingSection
        title="使用者詳情"
        description={`${user.name} 的帳號、個人資料與社團紀錄。`}
        actions={
          <div className="flex flex-wrap gap-2">
            <UserProfileEditButton userId={user.id} profile={user.profile} />
            <ButtonLink href={returnTo} variant="outline">
              返回使用者管理
            </ButtonLink>
          </div>
        }
      />

      <section className="space-y-8 px-4 pb-6 sm:px-6 lg:px-8">
        <DetailSection title="帳號資料">
          <Card className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="使用者名稱" value={user.name} />
            <Info label="Email" value={user.email} />
            <div>
              <dt className="text-sm text-(--text-muted)">Email 驗證</dt>
              <dd className="mt-1 space-y-1.5">
                <EmailVerificationBadge verifiedAt={user.email_verified_at} />
                {user.email_verified_at ? (
                  <p className="text-sm text-(--text-muted)">
                    {formatDateTime(user.email_verified_at)}
                  </p>
                ) : null}
              </dd>
            </div>
            <Info label="建立時間" value={formatDateTime(user.created_at)} />
            <Info label="更新時間" value={formatDateTime(user.updated_at)} />
          </Card>
        </DetailSection>

        <DetailSection title="最近一次 Email 驗證連結">
          <Card className="p-5">
            <p className="mb-3 text-sm text-(--text-muted)">僅顯示最近一次連結的紀錄；建立紀錄不代表驗證信已送達。重寄取代的連結也會標記為已使用／失效。</p>
            {verification ? (
              <dl className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="連結狀態" value={{ active: "有效", expired: "已過期", consumed: "已使用／失效" }[verification.status]} />
                <Info label="建立時間" value={formatDateTime(verification.created_at)} />
                <Info label="到期時間" value={formatDateTime(verification.expires_at)} />
                <Info label="使用／失效時間" value={verification.consumed_at ? formatDateTime(verification.consumed_at) : "尚未使用"} />
              </dl>
            ) : <p className="text-sm text-(--text-muted)">尚無驗證連結紀錄</p>}
          </Card>
        </DetailSection>

        <DetailSection title="個人資料">
          <Card className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="真實姓名" value={user.profile?.real_name || MISSING_VALUE} />
            <Info label="聯絡電話" value={user.profile?.phone || MISSING_VALUE} />
            <Info label="學號" value={user.profile?.student_id || MISSING_VALUE} />
            <Info label="學校" value={user.profile?.school || MISSING_VALUE} />
            <Info label="系所" value={user.profile?.department || MISSING_VALUE} />
            <Info label="年級" value={user.profile?.grade || MISSING_VALUE} />
          </Card>
        </DetailSection>

        <DetailSection title="社員紀錄">
          {user.memberships.length === 0 ? (
            <EmptyState compact title="目前沒有社員資格紀錄" />
          ) : (
            <div className="space-y-3">
              {user.memberships.map((membership) => (
                <Card key={membership.id} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {membership.academic_year?.year
                          ? `${membership.academic_year.year} 學年度`
                          : MISSING_VALUE}
                      </p>
                      <p className="mt-1 text-sm text-(--text-muted)">
                        加入時間：{membership.joined_at ? formatDateTime(membership.joined_at) : MISSING_VALUE}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full border border-(--border) px-2.5 py-1 text-xs font-medium text-(--text-primary)">
                        <MembershipTypeLabel type={membership.type} />
                      </span>
                      <MemberStatusBadge status={membership.status} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title="幹部紀錄">
          {user.officer_positions.length === 0 ? (
            <EmptyState compact title="目前沒有幹部紀錄" />
          ) : (
            <div className="space-y-3">
              {user.officer_positions.map((position) => (
                <Card
                  key={position.id}
                  className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="font-medium">{position.title}</p>
                  <p className="text-sm text-(--text-muted)">
                    {position.academic_year?.year
                      ? `${position.academic_year.year} 學年度`
                      : MISSING_VALUE}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </DetailSection>
      </section>
    </>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-(--text-primary)">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-(--text-muted)">{label}</dt>
      <dd className="mt-1 wrap-anywhere font-medium text-(--text-primary)">{value}</dd>
    </div>
  );
}
