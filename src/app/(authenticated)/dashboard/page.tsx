import { getCurrentUser } from "@/libs/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <section>
      <div className="container flex flex-col gap-6 py-8"></div>
    </section>
  );
}
