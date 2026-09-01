import { Header } from "@/components/Header/Header";
import { User } from "@/types/database";

type WebsiteShellProps = {
  user: User | null;
  isAdmin: boolean;
  children: React.ReactNode;
};

export function WebsiteShell({ user, children, isAdmin }: WebsiteShellProps) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-(--surface-default) px-4 py-2 text-sm font-medium text-(--action) shadow-(--shadow-card) focus:not-sr-only focus:outline-none"
      >
        跳至主要內容
      </a>
      <Header user={user} isAdmin={isAdmin} />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
    </>
  );
}
