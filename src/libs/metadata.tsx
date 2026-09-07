import type { Metadata } from "next";
import { siteConfigs } from "./siteConfigs";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfigs.url),
  title: {
    default: `${siteConfigs.name}｜${siteConfigs.fullName}`,
    template: `%s｜${siteConfigs.name}`,
  },
  description: siteConfigs.description,
  icons: [
    {
      rel: "icon",
      url: siteConfigs.icon,
    },
  ],
};
