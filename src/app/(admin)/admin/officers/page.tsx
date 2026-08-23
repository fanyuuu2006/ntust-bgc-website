import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { OfficerManager } from "@/components/(admin)/admin/officers/OfficerManager";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
import { membershipService } from "@/services/memberships/memberships.service";
import { usersService } from "@/services/users/users.service";
export default async function OfficersPage() { const [officers, years, users] = await Promise.all([officerPositionsService.listForAdmin({ page: 1, pageSize: 100 }), membershipService.listAcademicYears(), usersService.listForAdmin({ page: 1, pageSize: 100 })]); return <><HeadingSection title="幹部管理" description="依學年度管理幹部職位；只有目前學年度的幹部可以使用管理後台。" /><section className="px-4 pb-6"><OfficerManager officers={officers.data} years={years} users={users.data} /></section></>; }
