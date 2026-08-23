"use client";

import { useState } from "react";

import { RegisterKeyStatusBadge } from "@/components/(admin)/admin/members/RegisterKeyStatusBadge";
import type { MembershipRegisterKeyWithAcademicYear } from "@/services/memberships/memberships.types";
import { cn } from "@/utils/className";
import { formatDate } from "@/utils/date";

type RegisterKeyTableProps = React.HTMLAttributes<HTMLDivElement> & {
  registerKeys: MembershipRegisterKeyWithAcademicYear[];
  hasFilters?: boolean;
};

export function RegisterKeyTable({
  registerKeys,
  hasFilters = false,
  className,
  ...rest
}: RegisterKeyTableProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyKey(registerKey: string) {
    await navigator.clipboard.writeText(registerKey);
    setCopiedKey(registerKey);
  }

  if (registerKeys.length === 0) {
    return (
      <div className={cn("card p-8 text-center", className)} {...rest}>
        <p className="text-sm font-medium text-(--foreground)">
          {hasFilters
            ? "目前沒有符合條件的社員註冊序號"
            : "目前尚未產生社員註冊序號"}
        </p>
        <p className="mt-1 text-sm text-(--muted)">
          {hasFilters
            ? "調整搜尋或篩選條件後再試一次。"
            : "產生序號後，幹部可在這裡複製並發放給已繳費社員。"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} {...rest}>
      <div className="grid gap-3 lg:hidden">
        {registerKeys.map((registerKey) => (
          <article key={registerKey.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs text-(--foreground)">
                  {registerKey.register_key}
                </p>
                <p className="mt-1 text-xs text-(--muted)">
                  {registerKey.academic_year?.year ?? "-"} 學年度 · #
                  {registerKey.sequence_number}
                </p>
              </div>
              <RegisterKeyStatusBadge status={registerKey.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Info label="產生時間">{formatDate(registerKey.created_at)}</Info>
              <Info label="啟用時間">
                {registerKey.claimed_at ? formatDate(registerKey.claimed_at) : "-"}
              </Info>
              <Info label="建立者">
                {registerKey.created_by_user?.name ?? "-"}
              </Info>
              <Info label="關聯資格">
                {registerKey.claimed_membership?.id ? "已建立" : "-"}
              </Info>
            </dl>
            <button
              type="button"
              onClick={() => copyKey(registerKey.register_key)}
              className="btn outline mt-4 w-full rounded-md px-3 py-2 text-sm font-medium"
            >
              {copiedKey === registerKey.register_key ? "已複製" : "複製序號"}
            </button>
          </article>
        ))}
      </div>

      <div className="card hidden overflow-hidden lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-(--secondary-background)">
            <tr className="border-b border-(--border)">
              <HeaderCell>序號</HeaderCell>
              <HeaderCell>學年度</HeaderCell>
              <HeaderCell>流水號</HeaderCell>
              <HeaderCell>狀態</HeaderCell>
              <HeaderCell>產生時間</HeaderCell>
              <HeaderCell>啟用時間</HeaderCell>
              <HeaderCell>建立者</HeaderCell>
              <HeaderCell>操作</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {registerKeys.map((registerKey) => (
              <tr
                key={registerKey.id}
                className="border-b border-(--border) last:border-0 hover:bg-(--secondary-background)"
              >
                <BodyCell className="font-mono text-xs whitespace-nowrap text-(--foreground)">
                  {registerKey.register_key}
                </BodyCell>
                <BodyCell className="whitespace-nowrap">
                  {registerKey.academic_year?.year ?? "-"} 學年度
                </BodyCell>
                <BodyCell className="font-mono text-xs">
                  {registerKey.sequence_number}
                </BodyCell>
                <BodyCell>
                  <RegisterKeyStatusBadge status={registerKey.status} />
                </BodyCell>
                <BodyCell className="whitespace-nowrap">
                  {formatDate(registerKey.created_at)}
                </BodyCell>
                <BodyCell className="whitespace-nowrap">
                  {registerKey.claimed_at
                    ? formatDate(registerKey.claimed_at)
                    : "-"}
                </BodyCell>
                <BodyCell className="whitespace-nowrap">
                  {registerKey.created_by_user?.name ?? "-"}
                </BodyCell>
                <BodyCell>
                  <button
                    type="button"
                    onClick={() => copyKey(registerKey.register_key)}
                    className="btn outline rounded-md px-3 py-1.5 text-xs font-medium"
                  >
                    {copiedKey === registerKey.register_key
                      ? "已複製"
                      : "複製"}
                  </button>
                </BodyCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 font-medium whitespace-nowrap text-(--muted)">
      {children}
    </th>
  );
}

function BodyCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-3 py-2 align-middle text-(--muted)", className)}>
      {children}
    </td>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-(--muted)">{label}</dt>
      <dd className="mt-1 text-(--foreground)">{children}</dd>
    </div>
  );
}
