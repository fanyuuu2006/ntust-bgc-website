import { notFound } from "next/navigation";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AttendanceManager } from "@/components/(admin)/admin/events/AttendanceManager";
import { eventsService } from "@/services/events/events.service";
import { usersService } from "@/services/users/users.service";
export default async function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [event, records, users] = await Promise.all([eventsService.getEventById(id), eventsService.listAttendancesForAdmin(id), usersService.listForAdmin({ pageSize: 100 })]); if (!event) notFound(); return <><HeadingSection title={event.name} description={`${new Date(event.start_time).toLocaleString("zh-TW")} 至 ${new Date(event.end_time).toLocaleString("zh-TW")}`} /><section className="px-4 pb-6"><div className="card mb-5 rounded-2xl p-5"><p className="whitespace-pre-wrap text-sm leading-7">{event.description || "未提供活動說明。"}</p></div><AttendanceManager eventId={event.id} records={records} users={users.data} /></section></>; }
