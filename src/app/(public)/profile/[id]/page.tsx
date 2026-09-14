import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { UserAvatar } from "@/components/UserAvatar";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { getPublicProfile } from "./public-profile";

type Props = { params: Promise<{ id: string }> };

async function profileMetadata({ params }: Props): Promise<Metadata> {
  const identity = await getPublicProfile((await params).id);
  return {
    title: "公開個人頁面",
    description: "查看使用者在本站公開的顯示名稱與頭像。",
    robots: { index: false, follow: true },
    alternates: { canonical: `/profile/${identity.id}` },
  };
}

async function PublicProfilePage({ params }: Props) {
  const identity = await getPublicProfile((await params).id);
  return (
    <section className="container min-w-0 max-w-3xl space-y-4 py-8 sm:py-10">
      <p className="text-sm text-(--text-muted)">公開個人頁面</p>
      <Card className="flex min-w-0 items-center gap-4 p-5 sm:gap-5 sm:p-6">
        <UserAvatar user={identity} referrerPolicy="no-referrer" className="size-16 shrink-0 rounded-xl object-cover sm:size-20" />
        <h1 className="min-w-0 wrap-anywhere text-xl font-semibold text-(--text-primary) sm:text-2xl">{identity.name}</h1>
      </Card>
    </section>
  );
}

export const generateMetadata = withServerErrorReference(profileMetadata, "/profile/[id]");
export default withServerErrorReference(PublicProfilePage, "/profile/[id]");
