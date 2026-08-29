"use client";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { User } from "@/types/database";
import {
  AttendanceActions,
  type AttendanceRecord,
} from "./AttendanceActions";
import { AttendanceDeleteAction } from "./AttendanceDeleteAction";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";

export function AttendanceRecords({
  eventId,
  records,
  users,
}: {
  eventId: string;
  records: AttendanceRecord[];
  users: User[];
}) {
  if (!records.length) {
    return (
      <EmptyState
        title="目前沒有簽到紀錄"
        description="可從頁面標題旁新增第一筆簽到紀錄。"
      />
    );
  }

  return (
    <>
      <Card className="hidden overflow-x-auto p-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>使用者</TableHead>
              <TableHead>學號</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>簽到時間</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">
                  {record.profile?.real_name || record.user.name}
                </TableCell>
                <TableCell>
                  {record.profile?.student_id || record.user.email}
                </TableCell>
                <TableCell>
                  <AttendanceStatusBadge status={record.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatAttendanceTime(record.attended_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <AttendanceActions
                      eventId={eventId}
                      users={users}
                      record={record}
                    />
                    <AttendanceDeleteAction eventId={eventId} record={record} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 md:hidden">
        {records.map((record) => (
          <Card key={record.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {record.profile?.real_name || record.user.name}
                </p>
                <p className="break-all text-sm text-(--muted)">
                  {record.profile?.student_id || record.user.email}
                </p>
              </div>
              <span className="shrink-0">
                <AttendanceStatusBadge status={record.status} />
              </span>
            </div>
            <p className="mt-2 text-sm">
              簽到時間：{formatAttendanceTime(record.attended_at)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AttendanceActions
                eventId={eventId}
                users={users}
                record={record}
              />
              <AttendanceDeleteAction eventId={eventId} record={record} />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function formatAttendanceTime(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-TW") : "未簽到";
}
