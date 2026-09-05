import { Footer } from "@/components/Footer/Footer";
import { Header } from "@/components/Header/Header";
import type { User } from "@/types/database";

type WebsiteShellProps = {
  user: User | null;
  isAdmin: boolean;
  footerVariant?: "full" | "legal";
  children: React.ReactNode;
};

export function WebsiteShell({
  user,
  children,
  isAdmin,
  footerVariant = "full",
}: WebsiteShellProps) {
  return (
    <div className="flex min-h-dvh shrink-0 flex-col">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-(--surface-default) px-4 py-2 text-sm font-medium text-(--action) shadow-(--shadow-card) focus:not-sr-only focus:outline-none"
      >
        跳至主要內容
      </a>
      <Header user={user} isAdmin={isAdmin} />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-w-0 flex-1 focus:outline-none"
      >
        {children}
      </main>
      <Footer variant={footerVariant} />
    </div>
  );
}
