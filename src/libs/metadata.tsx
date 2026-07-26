import { Metadata } from "next";
import { siteConfigs } from "./siteConfigs";

export const metadata: Metadata = {
  title: {
    default: siteConfigs.title,
    template: "%s | " + siteConfigs.title,
  },
  description: siteConfigs.description,
  icons: [
    {
      rel: "icon",
      url: siteConfigs.icon,
    },
  ],
};
