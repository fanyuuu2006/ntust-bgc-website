import { getCurrentUser } from "@/libs/auth";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <h1>你好，{user.name}</h1>;
}
