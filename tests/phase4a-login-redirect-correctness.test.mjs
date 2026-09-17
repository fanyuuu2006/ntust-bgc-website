import assert from "node:assert/strict";
import { after, test } from "node:test";
import { JSDOM } from "jsdom";
import { load } from "./helpers/load-app-module.mjs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://club.example/login",
  pretendToBeVisual: true,
});
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { createRoot } = await import("react-dom/client");
after(() => dom.window.close());

const Button = ({ children, isLoading, ...props }) =>
  React.createElement(
    "button",
    { ...props, "aria-busy": isLoading || undefined },
    children,
  );
const FieldInput = ({ field, value, onChange }) =>
  React.createElement("input", {
    id: field.id,
    name: field.id,
    type: field.type,
    value,
    disabled: field.disabled,
    onChange,
  });
const FormFeedback = ({ error }) => error
  ? React.createElement("p", { role: "alert" }, error)
  : null;

async function submit(form) {
  await React.act(async () => {
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function mountLogin(t, { returnTo, emailVerified = true, failure } = {}) {
  const apiCalls = [];
  const documentNavigations = [];
  const routerNavigations = [];
  const LoginForm = load("src/components/(auth)/login/LoginForm.tsx", {
    "next/navigation": {
      useRouter: () => ({
        replace: (path) => routerNavigations.push(path),
        refresh: () => routerNavigations.push("refresh"),
      }),
      useSearchParams: () => new URLSearchParams(returnTo ? { returnTo } : {}),
    },
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
    "@/components/FieldInput": { FieldInput },
    "@/components/FormFeedback": { FormFeedback },
    "@/components/ui/Button": { Button },
    "@/utils/className": { cn: (...values) => values.filter(Boolean).join(" ") },
    "@/libs/api/errors": { ApiError: class ApiError extends Error {} },
    "@/libs/api/client": {
      apiClient: async (...args) => {
        apiCalls.push(args);
        if (failure) throw failure;
        return { data: { id: "user", email: "user@example.com", name: "User", emailVerified } };
      },
    },
    "@/libs/navigation/auth-boundary": {
      replaceAuthBoundary: (path) => documentNavigations.push(path),
    },
  }).LoginForm;

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await React.act(async () => root.render(React.createElement(LoginForm)));
  t.after(async () => {
    await React.act(async () => root.unmount());
    host.remove();
  });
  return { host, apiCalls, documentNavigations, routerNavigations };
}

test("login return policy preserves safe destinations and rejects auth-transition routes", () => {
  const { getSafeLoginReturnPath } = load("src/utils/redirect.ts");
  for (const path of ["/dashboard", "/borrowings?page=2", "/settings#sessions", "/admin/users?page=3"]) {
    assert.equal(getSafeLoginReturnPath(path), path);
  }
  for (const path of [
    "https://evil.example/steal",
    "//evil.example/steal",
    "/login",
    "/login?returnTo=%2Flogin",
    "/register",
    "/verify-email",
    "/verify-email?token=secret",
    "/verify-email/pending",
    "/api/auth/email-verification/confirm",
    "/dashboard\nX-Test: injected",
  ]) {
    assert.equal(getSafeLoginReturnPath(path), "/dashboard", path);
  }
});

test("verified login crosses the cookie boundary with one fresh document request", async (t) => {
  const ui = await mountLogin(t, { returnTo: "/borrowings?page=2" });
  await submit(ui.host.querySelector("form"));
  assert.equal(ui.apiCalls.length, 1);
  assert.deepEqual(ui.documentNavigations, ["/borrowings?page=2"]);
  assert.deepEqual(ui.routerNavigations, []);
});

test("direct verified login uses dashboard and unverified login cannot bypass pending verification", async (t) => {
  const verified = await mountLogin(t);
  await submit(verified.host.querySelector("form"));
  assert.deepEqual(verified.documentNavigations, ["/dashboard"]);

  const unverified = await mountLogin(t, { returnTo: "/admin/users", emailVerified: false });
  await submit(unverified.host.querySelector("form"));
  assert.deepEqual(unverified.documentNavigations, ["/verify-email/pending"]);
});

test("failed login stays on the login document", async (t) => {
  const ui = await mountLogin(t, { failure: new Error("登入失敗") });
  await submit(ui.host.querySelector("form"));
  assert.deepEqual(ui.documentNavigations, []);
  assert.deepEqual(ui.routerNavigations, []);
  assert.match(ui.host.textContent, /登入失敗/);
});

test("logout crosses the cleared-cookie boundary with a fresh anonymous document", async (t) => {
  const documentNavigations = [];
  const routerActions = [];
  const apiCalls = [];
  const LogoutButton = load("src/components/LogoutButton.tsx", {
    "next/navigation": { useRouter: () => ({ refresh: () => routerActions.push("refresh") }) },
    "@/components/ui/Button": { Button },
    "@/components/FormFeedback": { FormFeedback },
    "@/libs/api/client": { apiClient: async (...args) => apiCalls.push(args) },
    "@/libs/navigation/auth-boundary": {
      replaceAuthBoundary: (path) => documentNavigations.push(path),
    },
  }).LogoutButton;
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await React.act(async () => root.render(React.createElement(LogoutButton, null, "登出")));
  t.after(async () => {
    await React.act(async () => root.unmount());
    host.remove();
  });

  await React.act(async () => {
    host.querySelector("button").click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  assert.deepEqual(apiCalls, [["/api/auth/logout", { method: "POST" }]]);
  assert.deepEqual(documentNavigations, ["/"]);
  assert.deepEqual(routerActions, []);
});
