import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AdminBreadcrumbs } from "@/components/(admin)/admin/AdminBreadcrumbs";
import { Button } from "@/components/ui/Button";
import { EventCalendarPoc } from "@/components/(admin)/admin/events/EventCalendarPoc";

export default function EventCalendarPocPage() {
  return (
    <>
      <HeadingSection
        collection
        breadcrumb={
          <AdminBreadcrumbs
            items={[
              { href: "/admin", label: "管理總覽" },
              { href: "/admin/events", label: "活動管理" },
              { label: "活動行事曆" },
            ]}
          />
        }
        title="活動行事曆"
        description="管理與查看社團活動行程。"
        actions={
          <Button type="button" disabled title="PoC 尚未連接正式活動建立流程">
            ＋ 新增活動
          </Button>
        }
      />
      <EventCalendarPoc />
    </>
  );
}
