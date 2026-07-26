import { siteConfigs } from "@/libs/siteConfigs";
import { cn } from "@/utils/className";
import Image from "next/image";
import Link from "next/link";

type HeaderProps = React.HTMLAttributes<HTMLElement>;

export const Header = ({ className, ...rest }: HeaderProps) => {
  return (
    <header
      className={cn("flex flex-col border-b border-(--border)", className)}
      {...rest}
    >
      <div className="container flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="rounded-full size-16 overflow-hidden">
            <Image
              src={siteConfigs.logo}
              alt={`${siteConfigs.title} Logo`}
              width={320}
              height={320}
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-bold">{siteConfigs.title}</h1>
        </Link>
      </div>
    </header>
  );
};
