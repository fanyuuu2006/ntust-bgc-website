import { AuthCard } from "@/components/(auth)/AuthCard";
import { LoginForm } from "@/components/(auth)/login/LoginForm";

export default function LoginPage() {
  return (
    <section className="h-full">
      <div className="container h-full flex items-center justify-center">
        <AuthCard
          title="登入"
          description="請使用您的帳號密碼登入。"
          className="w-full max-w-md rounded-2xl"
        >
          <LoginForm />
        </AuthCard>
      </div>
    </section>
  );
}
