"use client";
import { apiClient } from "@/libs/api/client";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/FormFeedback";
import { useState } from "react";
import { replaceAuthBoundary } from "@/libs/navigation/auth-boundary";

type LogoutButtonProps = React.ComponentProps<typeof Button>;
export const LogoutButton = ({ onClick, ...rest }: LogoutButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleLogout(e: React.MouseEvent<HTMLButtonElement>) {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await apiClient<void>("/api/auth/logout", {
        method: "POST",
      });

      onClick?.(e);
      replaceAuthBoundary("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登出失敗，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <div>
      <Button
        type="button"
        onClick={handleLogout}
        isLoading={isLoading}
        className="w-full"
        {...rest}
      />
      {error ? <FormFeedback error={error} className="mt-2" /> : null}
    </div>
  );
};
