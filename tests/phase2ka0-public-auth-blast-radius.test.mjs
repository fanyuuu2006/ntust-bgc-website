import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const nodeRequire = createRequire(import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

async function loadCommonJsModule(path, overrides = {}, options = {}) {
  const source = await readSource(path);
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier.endsWith(".css")) return {};
    if (specifier in overrides) return overrides[specifier];
    if (options.allowNodeRequire) return nodeRequire(specifier);
    throw new Error(`Unexpected dependency in ${path}: ${specifier}`);
  };
  new Function("exports", "module", "require", javascript)(
    runtimeModule.exports,
    runtimeModule,
    localRequire,
  );
  return runtimeModule.exports;
}

class TestRepositoryError extends Error {
  constructor(context, cause) {
    super(`[Repository] ${context}`);
    this.name = "RepositoryError";
    this.context = context;
    this.cause = cause;
  }
}

function createRequestCache() {
  return (fn) => {
    let result;
    let called = false;
    return (...args) => {
      if (!called) {
        called = true;
        result = fn(...args);
      }
      return result;
    };
  };
}

async function loadPublicViewer({ getCurrentUser, isAdminByUserId }) {
  return loadCommonJsModule("src/libs/public-viewer.ts", {
    "server-only": {},
    react: { cache: createRequestCache() },
    "@/libs/auth": { getCurrentUser, isAdminByUserId },
    "@/repositories/shared/errors": { RepositoryError: TestRepositoryError },
  });
}

test("public viewer distinguishes anonymous visitors from unavailable infrastructure", async () => {
  const anonymous = await loadPublicViewer({
    getCurrentUser: async () => null,
    isAdminByUserId: async () => false,
  });
  assert.deepEqual(await anonymous.resolvePublicViewer(), {
    status: "resolved",
    user: null,
    isAdmin: false,
  });

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const unavailable = await loadPublicViewer({
      getCurrentUser: async () => {
        throw new TestRepositoryError("session lookup", { code: "PGRST000" });
      },
      isAdminByUserId: async () => false,
    });
    assert.deepEqual(await unavailable.resolvePublicViewer(), {
      status: "unavailable",
      user: null,
      isAdmin: false,
    });
  } finally {
    console.error = originalConsoleError;
  }
});

test("public viewer resolves user and Admin visibility without losing identity", async () => {
  const user = { id: "user-1", name: "member", email: "member@example.com" };
  const viewer = await loadPublicViewer({
    getCurrentUser: async () => user,
    isAdminByUserId: async (id) => id === user.id,
  });

  assert.deepEqual(await viewer.resolvePublicViewer(), {
    status: "resolved",
    user,
    isAdmin: true,
  });
});

test("public viewer degrades only recognized repository failures", async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    for (const getCurrentUser of [
      async () => {
        throw new TestRepositoryError("session lookup", null);
      },
      async () => {
        throw new TestRepositoryError("user lookup", null);
      },
    ]) {
      const viewer = await loadPublicViewer({
        getCurrentUser,
        isAdminByUserId: async () => false,
      });
      assert.equal((await viewer.resolvePublicViewer()).status, "unavailable");
    }

    const adminFailure = await loadPublicViewer({
      getCurrentUser: async () => ({ id: "admin-1" }),
      isAdminByUserId: async () => {
        throw new TestRepositoryError("officer lookup", null);
      },
    });
    assert.deepEqual(await adminFailure.resolvePublicViewer(), {
      status: "unavailable",
      user: null,
      isAdmin: false,
    });
  } finally {
    console.error = originalConsoleError;
  }

  const programmerError = new TypeError("programmer mistake");
  const unknownFailure = await loadPublicViewer({
    getCurrentUser: async () => {
      throw programmerError;
    },
    isAdminByUserId: async () => false,
  });
  await assert.rejects(unknownFailure.resolvePublicViewer(), programmerError);
});

test("public viewer memoizes one resolution per Server Component request", async () => {
  let sessionReads = 0;
  let adminReads = 0;
  const viewer = await loadPublicViewer({
    getCurrentUser: async () => {
      sessionReads += 1;
      return { id: "user-1" };
    },
    isAdminByUserId: async () => {
      adminReads += 1;
      return false;
    },
  });

  const first = viewer.resolvePublicViewer();
  const second = viewer.resolvePublicViewer();
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(sessionReads, 1);
  assert.equal(adminReads, 1);
});

test("RootLayout has no global session dependency or fake UserProvider", async () => {
  const source = await readSource("src/app/layout.tsx");
  assert.doesNotMatch(source, /getCurrentUser/);
  assert.doesNotMatch(source, /UserProvider/);
  assert.match(source, /<body[^>]*>[\s\S]*?\{children\}[\s\S]*?<\/body>/);
});

test("PublicLayout renders anonymous-style shell for an unavailable viewer", async () => {
  const WebsiteShell = Symbol("WebsiteShell");
  const { default: PublicLayout } = await loadCommonJsModule(
    "src/app/(public)/layout.tsx",
    {
      "react/jsx-runtime": {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      },
      "@/components/layouts/WebsiteShell": { WebsiteShell },
      "@/libs/public-viewer": {
        resolvePublicViewer: async () => ({
          status: "unavailable",
          user: null,
          isAdmin: false,
        }),
      },
    },
  );

  const rendered = await PublicLayout({ children: "public content" });
  assert.equal(rendered.type, WebsiteShell);
  assert.equal(rendered.props.user, null);
  assert.equal(rendered.props.isAdmin, false);
  assert.equal(rendered.props.children, "public content");
});

test("board-game detail keeps core content but skips personalization when viewer is unavailable", async () => {
  let membershipReads = 0;
  let borrowingReads = 0;
  const boardGame = {
    id: "game-1",
    name: "Safe Game",
    description: "Public description",
    image: null,
    status: "available",
    inventory_number: 1,
    category: { name: "Party" },
    location: { name: "A" },
  };
  const jsx = (type, props) => ({ type, props });
  const { default: BoardGameDetailPage } = await loadCommonJsModule(
    "src/app/(public)/board-games/[id]/page.tsx",
    {
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "lucide-react": { ArrowLeft: "ArrowLeft" },
      "@/components/(public)/board-games/BoardGameBorrowingPanel": {
        BoardGameBorrowingPanel: "BoardGameBorrowingPanel",
      },
      "@/components/(public)/board-games/BoardGameStatusBadge": {
        BoardGameStatusBadge: "BoardGameStatusBadge",
      },
      "@/components/BoardGameImage": { BoardGameImage: "BoardGameImage" },
      "@/components/ui/Button": { ButtonLink: "ButtonLink" },
      "@/libs/public-viewer": {
        resolvePublicViewer: async () => ({
          status: "unavailable",
          user: null,
          isAdmin: false,
        }),
      },
      "@/libs/metadata-content": {},
      "@/services/board-games/board-games.service": {
        boardGamesService: {
          getOpenBorrowingForUserAndBoardGame: async () => {
            borrowingReads += 1;
          },
        },
      },
      "@/services/memberships/memberships.service": {
        membershipService: {
          getCurrentMembershipByUserId: async () => {
            membershipReads += 1;
          },
        },
      },
      "@/utils/className": { cn: (...values) => values.filter(Boolean).join(" ") },
      "./board-game-detail": { getBoardGameDetail: async () => boardGame },
    },
  );

  const rendered = await BoardGameDetailPage({
    params: Promise.resolve({ id: boardGame.id }),
  });
  const serialized = JSON.stringify(rendered);
  assert.match(serialized, /Safe Game/);
  assert.match(serialized, /Public description/);
  assert.match(serialized, /目前暫時無法確認登入狀態，請稍後重新整理後再試。/);
  assert.doesNotMatch(serialized, /BoardGameBorrowingPanel/);
  assert.equal(membershipReads, 0);
  assert.equal(borrowingReads, 0);
});

test("strict layouts and mutation authorization keep using getCurrentUser", async () => {
  const paths = [
    "src/app/(auth)/layout.tsx",
    "src/app/(authenticated)/layout.tsx",
    "src/app/(admin)/layout.tsx",
    "src/libs/api/admin-authorization.ts",
    "src/app/api/board-games/[id]/borrow/route.ts",
  ];
  const sources = await Promise.all(paths.map(readSource));

  for (const [index, source] of sources.entries()) {
    assert.match(source, /getCurrentUser\(\)/, paths[index]);
    assert.doesNotMatch(source, /resolvePublicViewer/, paths[index]);
  }
});

test("strict getCurrentUser still propagates repository failures", async () => {
  const failure = new TestRepositoryError("session lookup", null);
  const { getCurrentUser } = await loadCommonJsModule("src/libs/auth.tsx", {
    react: { cache: (fn) => fn },
    "next/headers": {
      cookies: async () => ({ get: () => ({ value: "session-token" }) }),
    },
    "@/services/auth/auth.service": {
      authService: {
        getUserBySessionToken: async () => {
          throw failure;
        },
      },
    },
    "@/services/officer-positions/officer-positions.service": {
      officerPositionsService: { hasEverBeenOfficer: async () => false },
    },
  });

  await assert.rejects(getCurrentUser(), failure);
});
