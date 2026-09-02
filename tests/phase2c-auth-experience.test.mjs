import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("auth pages keep their server shells and distinguish website accounts from memberships", async () => {
  const [loginPage, registerPage] = await Promise.all([
    readSource("src/app/(auth)/login/page.tsx"),
    readSource("src/app/(auth)/register/page.tsx"),
  ]);

  assert.doesNotMatch(loginPage, /"use client"/);
  assert.doesNotMatch(registerPage, /"use client"/);
  assert.match(registerPage, /建立網站帳號/);
  assert.match(registerPage, /不等於加入社團/);
  assert.match(registerPage, /完成入社/);
  assert.match(registerPage, /社員註冊序號/);
  assert.doesNotMatch(registerPage, /AuthNotice/);
  await assert.rejects(access(new URL("../src/components/(auth)/AuthNotice.tsx", import.meta.url)));
});

test("auth forms expose primary submits, busy states, and password-manager semantics", async () => {
  const [login, register] = await Promise.all([
    readSource("src/components/(auth)/login/LoginForm.tsx"),
    readSource("src/components/(auth)/register/RegisterForm.tsx"),
  ]);

  for (const source of [login, register]) {
    assert.match(source, /aria-busy=\{isLoading \|\| undefined\}/);
    assert.match(source, /type="submit"[\s\S]*?variant="primary"/);
    assert.match(source, /autoComplete: "email"/);
    assert.match(source, /inputMode: "email"/);
  }

  assert.match(login, /autoComplete: "current-password"/);
  assert.match(register, /autoComplete: "new-password"/);
  assert.match(login, /registerHref/);
  assert.match(register, /loginHref/);
});

test("password reveal uses explicit Lucide icons without an icon registry", async () => {
  const [fieldInput, mobileNavigation] = await Promise.all([
    readSource("src/components/FieldInput.tsx"),
    readSource("src/components/Header/MobileNavigation.tsx"),
  ]);

  assert.match(fieldInput, /import \{ Eye, EyeOff \} from "lucide-react"/);
  assert.match(fieldInput, /aria-label=\{isPasswordVisible/);
  assert.match(fieldInput, /aria-pressed=\{isPasswordVisible\}/);
  assert.doesNotMatch(fieldInput, /@ant-design\/icons|import \* as Icons|IconRegistry|UniversalIcon/);
  assert.match(mobileNavigation, /import \{ Menu, X \} from "lucide-react"/);
  assert.doesNotMatch(mobileNavigation, /[☰×]/);
});

test("the repository no longer declares Ant Design icons and keeps Lucide as the functional icon source", async () => {
  const [packageJson, instructions] = await Promise.all([
    readSource("package.json"),
    readSource("AGENTS.md"),
  ]);

  assert.match(packageJson, /"lucide-react"/);
  assert.doesNotMatch(packageJson, /@ant-design\/icons|"antd"/);
  assert.doesNotMatch(instructions, /@ant-design\/icons/);
  assert.doesNotMatch(packageJson, /react-icons|@heroicons|fontawesome/);
});
