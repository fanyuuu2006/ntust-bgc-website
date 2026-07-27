"use client";
import { SubmitEvent, useState } from "react";

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const payload = {
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    };

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("註冊成功！");
    } catch {
      setMessage("發生未知錯誤，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <h1>註冊</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>

        <div>
          <label htmlFor="name">姓名</label>
          <input id="name" name="name" type="text" required />
        </div>

        <div>
          <label htmlFor="password">密碼</label>
          <input id="password" name="password" type="password" required />
        </div>

        <div>
          <label htmlFor="confirmPassword">確認密碼</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? "註冊中..." : "註冊"}
        </button>

        {message && <p>{message}</p>}
      </form>
    </main>
  );
}
