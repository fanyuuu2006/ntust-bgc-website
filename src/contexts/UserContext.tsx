"use client";
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { User } from "@/types/database";

type UserContextValue = {
  user: User | null;
};

export const userContext =
  createContext<UserContextValue | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: User | null;
  children: ReactNode;
}) {
  return (
    <userContext.Provider value={{ user }}>
      {children}
    </userContext.Provider>
  );
}

export function useUser() {
  const context = useContext(userContext);

  if (!context) {
    throw new Error(
      "useUser 必須在 UserProvider 內使用",
    );
  }

  return context;
}