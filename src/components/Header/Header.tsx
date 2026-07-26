import { siteConfigs } from "@/libs/siteConfigs";
import { cn } from "@/utils/className";
import Image from "next/image";
import Link from "next/link";
import { DesktopNavigation } from "./DesktopNavigation";
import { MobileNavigation } from "./MobileNavigation";

type HeaderProps = React.HTMLAttributes<HTMLElement>;

export const Header = ({ className, ...rest }: HeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex flex-col border-b border-(--border) bg-(--primary-background)/95 backdrop-blur",
        className,
      )}
      {...rest}
    >
      <div className="container flex items-center justify-between gap-4 py-2">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2"
          aria-label={`返回${siteConfigs.name}首頁`}
        >
          {/* Logo */}
          <div
            className={cn(
              "size-12 shrink-0 overflow-hidden rounded-xl border border-(--border) bg-(--primary-background)",
              "transition-all duration-300 group-hover:border-(--primary)",
              "sm:size-16",
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
            <p className="truncate text-base font-bold leading-tight text-(--foreground) sm:text-xl">
              {siteConfigs.name}
            </p>

            <p className="hidden text-xs text-(--muted) sm:block">
              {siteConfigs.shortDescription}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <DesktopNavigation />
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
};
