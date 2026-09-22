import type { Metadata } from "next";
import { AuthCard } from "@/components/(auth)/AuthCard";
import { ForgotPasswordForm } from "@/components/(auth)/password-recovery/ForgotPasswordForm";

export const metadata: Metadata = { title: "忘記密碼", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <section className="container flex justify-center py-8"><AuthCard title="忘記密碼" description="輸入帳號使用的 Email，符合條件時我們會寄出重設連結。" className="w-full max-w-md"><ForgotPasswordForm /></AuthCard></section>;
}
