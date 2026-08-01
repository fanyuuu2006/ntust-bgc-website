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
      <Header user={user} isAdmin={isAdmin} className="sticky top-0 z-50" />
      <main className="flex-1">{children}</main>
    </>
  );
}
