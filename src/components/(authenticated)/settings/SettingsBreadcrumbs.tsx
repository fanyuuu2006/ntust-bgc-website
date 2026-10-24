"use client";

import { usePathname } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";

const labels: Record<string, string> = {
  profile: "\u500b\u4eba\u8cc7\u6599",
  appearance: "\u5916\u89c0\u8207\u504f\u597d",
  security: "\u5b89\u5168\u6027",
  account: "\u5e33\u865f\u7ba1\u7406",
};

export function SettingsBreadcrumbs() {
  const segment = usePathname().split("/").filter(Boolean).at(-1);
  const label = segment ? labels[segment] : undefined;

  return (
    <Breadcrumbs
      items={[
        { href: "/settings", label: "\u8a2d\u5b9a" },
        ...(label ? [{ label }] : []),
      ]}
    />
  );
}
