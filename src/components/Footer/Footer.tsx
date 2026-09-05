import Link from "next/link";

import { publicNavigation } from "@/libs/navigation";
import { siteConfigs } from "@/libs/siteConfigs";

type FooterProps = {
  variant?: "full" | "legal";
};

const legalNavigation = [
  { label: "隱私權政策", href: "/privacy" },
  { label: "使用條款", href: "/terms" },
] as const;

export function Footer({ variant = "full" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  if (variant === "legal") {
    return (
      <footer className="shrink-0 border-t border-(--border-default) bg-(--surface-subtle)">
        <div className="container flex flex-col items-center gap-2 py-5 text-center text-sm text-(--text-muted) sm:flex-row sm:justify-between sm:text-left">
          <nav aria-label="法律資訊">
            <ul className="flex flex-wrap items-center justify-center gap-x-4 sm:justify-start">
              {legalNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-10 items-center hover:text-(--interactive-primary)"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p>© {currentYear} {siteConfigs.name}</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="shrink-0 border-t border-(--border-default) bg-(--surface-subtle)">
      <div className="container pt-8 pb-6 lg:pt-10 lg:pb-7">
        <div className="grid min-w-0 gap-y-5 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] lg:items-start lg:gap-x-10 xl:gap-x-14">
          <div className="min-w-0 max-w-72">
            <p className="text-base leading-5 font-semibold text-(--text-primary)">
              {siteConfigs.name}
            </p>
            <p className="mt-1 max-w-xs text-sm leading-5 text-(--text-muted)">
              {siteConfigs.fullName}
            </p>
          </div>

          <nav aria-label="網站導覽">
            <p className="text-sm leading-5 font-semibold text-(--text-primary)">
              網站導覽
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 lg:flex-col lg:items-start lg:gap-0">
              {publicNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-10 items-center text-sm text-(--text-secondary) hover:text-(--interactive-primary)"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <address className="min-w-0 not-italic">
            <p className="text-sm leading-5 font-semibold text-(--text-primary)">
              聯絡資訊
            </p>
            <ul className="mt-2">
              <li>
                <a
                  href="mailto:ntustboardgame@gmail.com"
                  className="inline-flex min-h-10 max-w-full items-center break-all text-sm text-(--text-secondary) hover:text-(--interactive-primary)"
                >
                  ntustboardgame@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/ntust_boardgame/"
                  className="inline-flex min-h-10 items-center text-sm text-(--text-secondary) hover:text-(--interactive-primary)"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </address>

          <nav aria-label="相關連結">
            <p className="text-sm leading-5 font-semibold text-(--text-primary)">
              相關連結
            </p>
            <ul className="mt-2">
              <li>
                <a
                  href="https://www.ntust.edu.tw/"
                  className="inline-flex min-h-10 items-center text-sm text-(--text-secondary) hover:text-(--interactive-primary)"
                >
                  臺科大官網
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-6 border-t border-(--border-default) pt-4 flex flex-col gap-1 text-sm leading-5 text-(--text-muted) sm:flex-row sm:items-center sm:justify-between lg:mt-7">
          <p>© {currentYear} {siteConfigs.fullName}</p>
          <nav aria-label="法律資訊">
            <ul className="flex flex-wrap gap-x-4">
              {legalNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-10 items-center hover:text-(--interactive-primary)"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
