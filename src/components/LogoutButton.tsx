"use client";
import { apiClient } from "@/libs/api/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type LogoutButtonProps = React.ComponentProps<typeof Button>;
export const LogoutButton = ({ onClick, ...rest }: LogoutButtonProps) => {
  const router = useRouter();
  async function handleLogout(e: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(e);
    try {
      await apiClient<void>("/api/auth/logout", {
        method: "POST",
      });

      router.refresh();
    } catch (error) {
      console.error("登出失敗", error);
    }
  }
  return <Button type="button" onClick={handleLogout} {...rest} />;
};
