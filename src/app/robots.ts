import type { MetadataRoute } from "next";

import { isProductionDeployment } from "@/libs/seo";
import { siteConfigs } from "@/libs/siteConfigs";

export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeployment()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${siteConfigs.url}/sitemap.xml`,
    host: siteConfigs.url,
  };
}
