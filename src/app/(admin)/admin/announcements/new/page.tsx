import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AnnouncementEditor } from "@/components/(admin)/admin/announcements/AnnouncementEditor";
export default function NewAnnouncementPage() { return <><HeadingSection title="新增公告" description="撰寫公告後可先儲存草稿，或直接發布到公開網站。" /><section className="px-4 pb-6 sm:px-6 lg:px-8"><div className="card rounded-2xl p-5"><AnnouncementEditor /></div></section></>; }
