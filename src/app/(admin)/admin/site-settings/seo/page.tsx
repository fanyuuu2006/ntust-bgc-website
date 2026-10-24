import { siteConfigs } from "@/libs/siteConfigs";
import { SiteSettingsForm } from "@/components/(admin)/admin/site-settings/SiteSettingsForm";
export default function SeoSettingsPage() { return <SiteSettingsForm category="seo" siteUrl={siteConfigs.url} />; }


