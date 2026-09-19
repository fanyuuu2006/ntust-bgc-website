import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [example, envModule, packageJson, replayWorkflow, richContentImage] =
  await Promise.all([
    readFile(".env.example", "utf8"),
    readFile("src/libs/env.tsx", "utf8"),
    readFile("package.json", "utf8"),
    readFile(".github/workflows/supabase-replay.yml", "utf8"),
    readFile("src/libs/rich-content/image.ts", "utf8"),
  ]);

test("ordinary collaborator env contract excludes unused maintenance credentials", () => {
  for (const unused of ["DATABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    assert.doesNotMatch(example, new RegExp(`^${unused}=`, "m"));
    assert.doesNotMatch(envModule, new RegExp(`process\\.env\\.${unused}\\b`));
    assert.doesNotMatch(packageJson, new RegExp(unused));
    assert.doesNotMatch(replayWorkflow, new RegExp(unused));
  }
});

test("browser-visible Supabase origin remains an explicit client contract", () => {
  assert.match(example, /^NEXT_PUBLIC_SUPABASE_URL=$/m);
  assert.match(
    richContentImage,
    /process\.env\.NEXT_PUBLIC_SUPABASE_URL/,
  );
  assert.doesNotMatch(
    richContentImage,
    /process\.env\.SUPABASE_SECRET_KEY/,
  );
});
