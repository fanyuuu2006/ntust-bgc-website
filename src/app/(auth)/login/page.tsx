import { AuthCard } from "@/components/(auth)/AuthCard";
import { LoginForm } from "@/components/(auth)/login/LoginForm";

export default function LoginPage() {
  return (
    <section className="py-4 sm:py-8">
      <div className="container flex justify-center">
        <AuthCard
          title="登入"
          description="登入你的網站帳號。"
          className="w-full max-w-md rounded-2xl"
        >
          <LoginForm />
        </AuthCard>
      </div>
    </section>
  );
}
