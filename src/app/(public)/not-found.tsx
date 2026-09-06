import { PageHeader } from "@/components/PageHeader";
import { ButtonLink } from "@/components/ui/Button";

export default function PublicNotFound() {
  return (
    <section className="container py-8 lg:py-24">
      <div className="max-w-xl">
        <PageHeader
          eyebrow="404"
          title="找不到這個頁面"
          description="這個頁面可能已移除，或網址不正確。"
        />
        <ButtonLink href="/" variant="primary" className="mt-6">
          返回首頁
        </ButtonLink>
      </div>
    </section>
  );
}
