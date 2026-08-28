import { AcademicYearManager } from "@/components/(admin)/admin/academic-years/AcademicYearManager";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { academicYearsService } from "@/services/academic-years/academic-years.service";
export default async function AcademicYearsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) { const { search } = await searchParams; const years = await academicYearsService.list(); const keyword = search?.trim(); const filteredYears = keyword ? years.filter((year) => year.year.includes(keyword)) : years; return <><HeadingSection title="學年度管理" description="建立、維護與切換目前學年度。" /><section className="space-y-4 px-4 pb-6"><form><AdminToolbar><Input name="search" defaultValue={search} placeholder="搜尋學年度" className="min-w-0 flex-1" /><Button type="submit">搜尋</Button></AdminToolbar></form><AcademicYearManager years={filteredYears} /></section></>; }
