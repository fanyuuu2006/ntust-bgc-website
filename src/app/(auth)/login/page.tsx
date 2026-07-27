import { AuthCard } from "@/components/(auth)/AuthCard";
import { LoginForm } from "@/components/(auth)/login/LoginForm";

export default function LoginPage() {
  return (
    <section>
      <div className="container flex items-center justify-center">
        <AuthCard title="登入">
          <LoginForm />
        </AuthCard>
      </div>
    </section>
  );
}
