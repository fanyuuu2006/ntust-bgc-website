import { siteConfigs } from "@/libs/siteConfigs";
import { SiteSettingsForm } from "@/components/(admin)/admin/site-settings/SiteSettingsForm";
export default function BrandingSettingsPage() { return <SiteSettingsForm category="branding" siteUrl={siteConfigs.url} />; }


