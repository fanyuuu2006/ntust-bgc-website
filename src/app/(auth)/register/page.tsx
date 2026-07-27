import { AuthCard } from "@/components/(auth)/AuthCard";
import { AuthNotice } from "@/components/(auth)/AuthNotice";
import { RegisterForm } from "@/components/(auth)/register/RegisterForm";

export default function Register() {
  return (
    <section className="h-full">
      <div className="container h-full flex items-center justify-center">
        <AuthCard
          title="註冊帳號"
          description="建立您的帳號以開始使用"
          className="w-full max-w-md rounded-2xl"
        >
          <div className="flex flex-col gap-6">
            <AuthNotice />
            <RegisterForm />
          </div>
        </AuthCard>
      </div>
    </section>
  );
}
