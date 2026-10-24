import { siteConfigs } from "@/libs/siteConfigs";
import { SiteSettingsForm } from "@/components/(admin)/admin/site-settings/SiteSettingsForm";
export default function ContactSettingsPage() { return <SiteSettingsForm category="contact" siteUrl={siteConfigs.url} />; }


