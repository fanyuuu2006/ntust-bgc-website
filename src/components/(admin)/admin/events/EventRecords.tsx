import Link from "next/link";
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
import { EventStatusBadge } from "./EventStatusBadge";
import { EventActions } from "./EventActions";
import type { Event } from "@/types/database";
import { formatAdminDateTime } from "@/utils/date";
export function EventRecords({ events }: { events: Event[] }) {
  if (!events.length)
    return (
      <EmptyState
        title="沒有符合條件的活動"
        description="調整搜尋或篩選條件後再試。"
      />
    );
  return (
    <>
      <Card className="hidden overflow-x-auto p-0 lg:block">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>活動</TableHead>
              <TableHead>開始時間</TableHead>
              <TableHead>結束時間</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="min-w-64">
                  <Link
                    className="font-medium hover:underline"
                    href={`/admin/events/${event.id}`}
                  >
                    {event.name}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatAdminDateTime(event.start_time)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatAdminDateTime(event.end_time)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <EventStatusBadge event={event} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex shrink-0 gap-2">
                    <EventActions event={event} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="grid gap-3 lg:hidden">
        {events.map((event) => (
          <Card key={event.id} className="w-full min-w-0 max-w-full p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  className="block truncate font-semibold"
                  href={`/admin/events/${event.id}`}
                >
                  {event.name}
                </Link>
                <p className="text-sm text-(--muted)">
                  {formatAdminDateTime(event.start_time)} 至{" "}
                  {formatAdminDateTime(event.end_time)}
                </p>
              </div>
              <span className="shrink-0">
                <EventStatusBadge event={event} />
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <EventActions event={event} />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
