"use client";
import { apiClient } from "@/libs/api/client";
import { useRouter } from "next/navigation";

type LogoutButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
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
  return <button type="button" onClick={handleLogout} {...rest} />;
};
