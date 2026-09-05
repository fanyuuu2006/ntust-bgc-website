import { siteConfigs } from "@/libs/siteConfigs";
import { cn } from "@/utils/className";
import Image from "next/image";
import Link from "next/link";
import { DesktopNavigation } from "./DesktopNavigation";
import { MobileNavigation } from "./MobileNavigation";
import { HeaderActions } from "./HeaderActions";
import { User } from "@/types/database";
import { publicNavigation } from "@/libs/navigation";

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  user: User | null;
  isAdmin: boolean;
};

export const Header = ({ className, user, isAdmin, ...rest }: HeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-(--border-default) bg-(--surface-default)",
        className,
      )}
      {...rest}
    >
      <div className="container grid min-h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-2 md:flex md:gap-4">
        <MobileNavigation items={publicNavigation} className="justify-self-start" />

        <div className="min-w-0 max-w-[42vw] justify-self-center md:mr-auto md:max-w-none md:justify-self-auto">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2"
            aria-label={`返回${siteConfigs.name}首頁`}
          >
            {/* Logo */}
            <div
              className={cn(
                "size-10 shrink-0 overflow-hidden rounded-full sm:size-12",
              )}
            >
              <Image
                src={siteConfigs.logo}
                alt={`${siteConfigs.fullName} Logo`}
                width={320}
                height={320}
                priority
                className="size-full object-contain"
              />
            </div>

            {/* Site Name */}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-(--text-primary) md:text-lg">
                {siteConfigs.name}
              </p>

              <p className="hidden text-xs text-(--muted) md:block">
                {siteConfigs.shortDescription}
              </p>
            </div>
          </Link>
        </div>

        <DesktopNavigation items={publicNavigation} />
        <div className="shrink-0 justify-self-end">
          <HeaderActions user={user} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
};
