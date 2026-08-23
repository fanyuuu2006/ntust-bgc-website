import Link from "next/link";
import { notFound } from "next/navigation";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { UserProfileEditButton } from "@/components/(admin)/admin/users/UserProfileEditButton";
import { usersService } from "@/services/users/users.service";
import { formatDate } from "@/utils/date";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await usersService.getUserForAdmin(id);
  if (!user) notFound();

  return <>
    <HeadingSection title={user.profile?.real_name || user.name} description="查看帳號資訊與管理端可維護的基本資料。" actions={<div className="flex flex-wrap gap-2"><UserProfileEditButton userId={user.id} profile={user.profile} /><Link href="/admin/users" className="btn outline rounded-lg px-4 py-2 text-sm">返回使用者管理</Link></div>} />
    <section className="px-4 pb-6"><dl className="card grid gap-4 rounded-2xl p-5 sm:grid-cols-2"><Info label="電子郵件">{user.email}</Info><Info label="帳號顯示名稱">{user.name}</Info><Info label="真實姓名">{user.profile?.real_name || "未填寫"}</Info><Info label="聯絡電話">{user.profile?.phone || "未填寫"}</Info><Info label="學號">{user.profile?.student_id || "未填寫"}</Info><Info label="學校／學院">{user.profile?.school || "未填寫"}</Info><Info label="系所">{user.profile?.department || "未填寫"}</Info><Info label="年級">{user.profile?.grade || "未填寫"}</Info><Info label="帳號建立時間">{formatDate(user.created_at)}</Info><Info label="最後更新時間">{formatDate(user.updated_at)}</Info></dl></section>
  </>;
}

function Info({ label, children }: { label: string; children: React.ReactNode }) { return <div><dt className="text-sm text-(--muted)">{label}</dt><dd className="mt-1 font-medium">{children}</dd></div>; }
