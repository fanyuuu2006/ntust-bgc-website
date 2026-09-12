import { withServerErrorReference } from "@/libs/observability/server-render";
import { getAdminReturnPath } from "@/utils/admin-return";
import { ButtonLink } from "@/components/ui/Button";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AnnouncementEditor } from "@/components/(admin)/admin/announcements/AnnouncementEditor";
async function NewAnnouncementPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) { const returnTo = getAdminReturnPath((await searchParams).returnTo, "/admin/announcements"); return <><HeadingSection actions={<ButtonLink href={returnTo} variant="outline">返回列表</ButtonLink>} title="新增公告" description="撰寫公告後可先儲存草稿，或直接發布到公開網站。" /><section className="px-4 pb-6 sm:px-6 lg:px-8"><div className="card rounded-2xl p-5"><AnnouncementEditor returnTo={returnTo} /></div></section></>;
}

export default withServerErrorReference(NewAnnouncementPage, "/admin/announcements/new");
