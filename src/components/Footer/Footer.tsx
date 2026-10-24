import Link from "next/link";

import { publicNavigation } from "@/libs/navigation";
import type { SiteSettings } from "@/types/site-settings";

type FooterProps = {
  variant?: "full" | "legal";
  settings: SiteSettings;
};

const legalNavigation = [
  { label: "支持本站", href: "/support" },
  { label: "隱私權政策", href: "/privacy" },
  { label: "使用條款", href: "/terms" },
] as const;

const relatedLinks = [
  { label: "臺科大官網", href: "https://www.ntust.edu.tw/" },
  { label: "抽獎系統", href: "https://bgc-lottery.vercel.app/" },
] as const;

const developers = [
  { name: "飯魚", href: "https://fanyu.vercel.app" },
  { name: "YBeanAn", href: "https://github.com/YBeanAn" },
] as const;

function DeveloperCredits() {
  return developers.map((developer, index) => (
    <span key={developer.href}>
      {index > 0 ? "、" : null}
      <a
        href={developer.href}
        className="hover:text-(--interactive-primary)"
      >
        {developer.name}
      </a>
    </span>
  ));
}

export function Footer({ variant = "full", settings }: FooterProps) {
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
                    className="inline-flex items-center hover:text-(--interactive-primary)"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-1 sm:text-right">
            <p>{settings.siteFullName}｜官方網站</p>
            <p>
              網站開發與維護：
              <DeveloperCredits />
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="shrink-0 border-t border-(--border-default) bg-(--surface-subtle)">
      <div className="container pt-8 pb-6 lg:pt-10 lg:pb-7">
        <div className="grid min-w-0 gap-y-5 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] lg:items-start lg:gap-x-10 xl:gap-x-14">
          <div className="min-w-0 max-w-72">
            <p className="text-lg leading-5 font-semibold text-(--text-primary)">
              {settings.siteName}
            </p>
            <p className="mt-1 max-w-xs text-sm leading-5 text-(--text-muted)">
              {settings.siteFullName}
            </p>
          </div>

          <nav aria-label="網站導覽">
            <p className="text-base leading-5 font-semibold text-(--text-primary)">
              網站導覽
            </p>
            <ul className="mt-2 flex flex-col gap-2 text-sm text-(--text-secondary)">
              {publicNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center text-sm text-(--text-secondary) hover:text-(--interactive-primary)"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <address className="min-w-0 not-italic">
            <p className="text-base leading-5 font-semibold text-(--text-primary)">
              聯絡資訊
            </p>
            <ul className="mt-2 flex flex-col gap-2 text-sm text-(--text-secondary)">
              <li>
                {settings.contactEmail ? <a
                  href={`mailto:${settings.contactEmail}`}
                  className="inline-flex max-w-full items-center break-all text-sm text-(--text-secondary) hover:text-(--interactive-primary)"
                >
                  {settings.contactEmail}
                </a> : <span>尚未提供聯絡信箱</span>}
              </li>
              {settings.socialLinks.map((link) => <li key={link.href}><a href={link.href} className="inline-flex items-center text-sm text-(--text-secondary) hover:text-(--interactive-primary)">{link.label}</a></li>)}
            </ul>
          </address>

          <nav aria-label="相關連結">
            <p className="text-base leading-5 font-semibold text-(--text-primary)">
              相關連結
            </p>
            <ul className="mt-2 flex flex-col gap-2 text-sm text-(--text-secondary)">
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="inline-flex items-center text-sm text-(--text-secondary) hover:text-(--interactive-primary)"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-(--border-default) pt-4 text-sm leading-5 text-(--text-muted) sm:flex-row sm:items-end sm:justify-between lg:mt-7">
          <div className="space-y-1">
            <p>{settings.siteFullName}｜官方網站</p>
            <p>
              網站開發與維護：
              <DeveloperCredits />
            </p>
          </div>
          <nav aria-label="法律資訊">
            <ul className="flex flex-wrap gap-x-4">
              {legalNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center hover:text-(--interactive-primary)"
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
