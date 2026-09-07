import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const nodeRequire = createRequire(import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

async function loadCommonJsModule(path, overrides = {}) {
  const source = await readSource(path);
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  const localRequire = (specifier) => overrides[specifier] ?? nodeRequire(specifier);
  new Function("exports", "module", "require", javascript)(
    runtimeModule.exports,
    runtimeModule,
    localRequire,
  );
  return runtimeModule.exports;
}

const validRegistration = {
  email: "member@example.com",
  name: "website-name",
  password: "Password1!",
  phone: "0912345678",
};

test("registration requires a trimmed non-empty real name", async () => {
  const usersSchemas = await loadCommonJsModule(
    "src/services/users/users.schema.tsx",
  );
  const { registerSchema } = await loadCommonJsModule(
    "src/services/auth/auth.schema.tsx",
    { "../users/users.schema": usersSchemas },
  );

  assert.equal(registerSchema.safeParse(validRegistration).success, false);
  assert.equal(
    registerSchema.safeParse({ ...validRegistration, real_name: "" }).success,
    false,
  );
  assert.equal(
    registerSchema.safeParse({ ...validRegistration, real_name: "   " }).success,
    false,
  );

  const parsed = registerSchema.parse({
    ...validRegistration,
    real_name: " 王小明 ",
  });
  assert.equal(parsed.real_name, "王小明");
});

test("self profile validation rejects real_name instead of silently dropping it", async () => {
  const { updateSelfProfileSchema } = await loadCommonJsModule(
    "src/services/users/users.schema.tsx",
  );
  const validSelfUpdate = {
    phone: "0912345678",
    student_id: "B12345678",
    school: "臺科大",
    department: "資訊管理系",
    grade: "四年級",
  };

  assert.deepEqual(updateSelfProfileSchema.parse(validSelfUpdate), validSelfUpdate);
  assert.equal(
    updateSelfProfileSchema.safeParse({ real_name: "另一個名字" }).success,
    false,
  );
  assert.equal(
    updateSelfProfileSchema.safeParse({
      ...validSelfUpdate,
      real_name: "另一個名字",
    }).success,
    false,
  );
});

test("admin profile validation accepts trimmed corrections and rejects blank names", async () => {
  const { updateUserProfileSchema } = await loadCommonJsModule(
    "src/services/users/users.schema.tsx",
  );
  const adminPayload = {
    phone: "0912345678",
    student_id: null,
    school: null,
    department: null,
    grade: null,
  };

  assert.equal(
    updateUserProfileSchema.safeParse({ ...adminPayload, real_name: "" }).success,
    false,
  );
  assert.equal(
    updateUserProfileSchema.safeParse({ ...adminPayload, real_name: "   " }).success,
    false,
  );
  assert.equal(
    updateUserProfileSchema.parse({
      ...adminPayload,
      real_name: " 王小明 ",
    }).real_name,
    "王小明",
  );
});

test("self and admin routes preserve validation and authorization boundaries", async () => {
  const [selfRoute, adminRoute] = await Promise.all([
    readSource("src/app/api/users/me/profile/route.ts"),
    readSource("src/app/api/admin/users/[id]/profile/route.ts"),
  ]);

  assert.match(selfRoute, /usersService\.updateSelfProfile\(user\.id, body\)/);
  assert.match(selfRoute, /error instanceof ZodError[\s\S]*status: 400/);
  assert.match(adminRoute, /isAdminByUserId/);
  assert.match(adminRoute, /if \(!\(await requireAdmin\(\)\)\)[\s\S]*status: 403/);
  assert.match(adminRoute, /error instanceof ZodError[\s\S]*status: 400/);
});

test("database schema rejects blank real names without rewriting existing data", async () => {
  const [migration, canonicalSchema] = await Promise.all([
    readSource("supabase/migrations/202609070001_enforce_real_name_integrity.sql"),
    readSource("supabase/schema/canonical-public-schema.sql"),
  ]);

  for (const source of [migration, canonicalSchema]) {
    assert.match(source, /user_profiles_real_name_nonempty_check/);
    assert.match(source, /check\s*\(btrim\(real_name\) <> ''\)/i);
  }
  assert.doesNotMatch(migration, /update\s+public\.user_profiles/i);
});
