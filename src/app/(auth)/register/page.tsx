import { AuthCard } from "@/components/(auth)/AuthCard";
import { RegisterForm } from "@/components/(auth)/register/RegisterForm";

export default function RegisterPage() {
  return (
    <section className="py-4 sm:py-8">
      <div className="container flex justify-center">
        <AuthCard
          title="建立網站帳號"
          description="建立帳號後，即可登入使用網站功能。"
          className="w-full max-w-md rounded-2xl"
        >
          <div className="flex flex-col gap-6">
            <p className="rounded-lg bg-(--surface-subtle) p-4 text-sm leading-6 text-(--text-muted)">
              建立網站帳號不等於加入社團。若要成為社員，請登入後使用社員註冊序號完成入社。
            </p>
            <RegisterForm />
          </div>
        </AuthCard>
      </div>
    </section>
  );
}
