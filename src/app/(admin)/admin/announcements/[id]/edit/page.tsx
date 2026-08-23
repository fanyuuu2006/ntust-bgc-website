import { notFound } from "next/navigation";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AnnouncementEditor } from "@/components/(admin)/admin/announcements/AnnouncementEditor";
import { announcementsService } from "@/services/announcements/announcements.service";
export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) { const item = await announcementsService.getForAdmin((await params).id); if (!item) notFound(); return <><HeadingSection title="編輯公告" description={item.is_published ? "此公告已發布；儲存時不會重設發布時間。" : "此公告目前為草稿。"} /><section className="px-4 pb-6 sm:px-6 lg:px-8"><div className="card rounded-2xl p-5"><AnnouncementEditor announcement={item} /></div></section></>; }
