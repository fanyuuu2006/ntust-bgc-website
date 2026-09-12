import { withServerErrorReference } from "@/libs/observability/server-render";
import { getAdminReturnPath } from "@/utils/admin-return";
import { ButtonLink } from "@/components/ui/Button";
import { notFound } from "next/navigation";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AnnouncementEditor } from "@/components/(admin)/admin/announcements/AnnouncementEditor";
import { announcementsService } from "@/services/announcements/announcements.service";
import { positiveIntegerIdSchema } from "@/libs/zod/ids";
async function EditAnnouncementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string | string[] }> }) { const returnTo = getAdminReturnPath((await searchParams).returnTo, "/admin/announcements"); const id = positiveIntegerIdSchema.safeParse((await params).id); if (!id.success) notFound(); const item = await announcementsService.getForAdmin(id.data); if (!item) notFound(); return <><HeadingSection actions={<ButtonLink href={returnTo} variant="outline">返回列表</ButtonLink>} title="編輯公告" description={item.is_published ? "此公告已發布；儲存時不會重設發布時間。" : "此公告目前為草稿。"} /><section className="px-4 pb-6 sm:px-6 lg:px-8"><div className="card rounded-2xl p-5"><AnnouncementEditor announcement={item} returnTo={returnTo} /></div></section></>;
}

export default withServerErrorReference(EditAnnouncementPage, "/admin/announcements/[id]/edit");
