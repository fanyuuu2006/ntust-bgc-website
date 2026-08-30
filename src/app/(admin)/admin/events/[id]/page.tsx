import { notFound } from "next/navigation";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AttendanceActions } from "@/components/(admin)/admin/events/AttendanceActions";
import { AttendanceRecords } from "@/components/(admin)/admin/events/AttendanceRecords";
import { eventsService } from "@/services/events/events.service";
import { usersService } from "@/services/users/users.service";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, records, users] = await Promise.all([
    eventsService.getEventById(id),
    eventsService.listAttendancesForAdmin(id),
    usersService.listForAdmin({ pageSize: 100 }),
  ]);

  if (!event) notFound();

  return (
    <>
      <HeadingSection
        title={event.name}
        description={
          new Date(event.start_time).toLocaleString("zh-TW") +
          " 至 " +
          new Date(event.end_time).toLocaleString("zh-TW")
        }
        actions={<AttendanceActions eventId={event.id} users={users.data} />}
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <div className="card rounded-2xl p-5">
          <p className="whitespace-pre-wrap text-sm leading-7">
            {event.description || "此活動尚未提供說明。"}
          </p>
        </div>
        <AttendanceRecords
          eventId={event.id}
          records={records}
        />
      </section>
    </>
  );
}
