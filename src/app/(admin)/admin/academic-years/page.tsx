import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AcademicYearManager } from "@/components/(admin)/admin/academic-years/AcademicYearManager";
import { academicYearsService } from "@/services/academic-years/academic-years.service";
export default async function AcademicYearsPage() { const years = await academicYearsService.list(); return <><HeadingSection title="學年度管理" description="設定目前學年度會影響社員資格與幹部後台權限。" /><section className="px-4 pb-6"><AcademicYearManager years={years} /></section></>; }
