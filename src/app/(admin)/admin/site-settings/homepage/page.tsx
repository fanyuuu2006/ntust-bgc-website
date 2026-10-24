import { siteConfigs } from "@/libs/siteConfigs";
import { SiteSettingsForm } from "@/components/(admin)/admin/site-settings/SiteSettingsForm";
export default function HomepageSettingsPage() { return <SiteSettingsForm category="homepage" siteUrl={siteConfigs.url} />; }


