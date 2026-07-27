import { AuthCard } from "@/components/(auth)/AuthCard";
import { LoginForm } from "@/components/(auth)/login/LoginForm";

export default function LoginPage() {
  return (
    <section className="h-full">
      <div className="container h-full flex items-center justify-center">
        <AuthCard title="登入">
          <LoginForm />
        </AuthCard>
      </div>
    </section>
  );
}
