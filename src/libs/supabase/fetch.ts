import "server-only";

type FetchImplementation = typeof fetch;
type Delay = (milliseconds: number) => Promise<void>;

const RETRY_DELAY_MS = 100;

/** SDK 將 HTTP response 拆成 error 後，Repository 通常只收到 error；保留實際狀態，避免猜測 code 對應值。 */
async function retainErrorStatus(response: Response, url: URL, retryAttempted = false): Promise<Response> {
  if (response.ok || !url.pathname.startsWith("/rest/v1/")) return response;
  try {
    const body: unknown = await response.clone().json();
    if (!body || typeof body !== "object" || !("code" in body) || !("message" in body)) return response;
    const headers = new Headers(response.headers);
    headers.delete("content-length"); headers.delete("content-encoding");
    return new Response(JSON.stringify({ ...body, status: response.status, retryAttempted, retrySucceeded: false }), { status: response.status, statusText: response.statusText, headers });
  } catch { return response; }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  return input instanceof Request ? input.method.toUpperCase() : "GET";
}

async function isFutureIssuedJwtFailure(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;

  try {
    const body = (await response.clone().json()) as {
      code?: unknown;
      message?: unknown;
    };
    return (
      body.code === "PGRST303" &&
      typeof body.message === "string" &&
      body.message.toLowerCase().includes("jwt issued at future")
    );
  } catch {
    return false;
  }
}

export function createSupabaseFetch(
  fetchImplementation: FetchImplementation = fetch,
  delay: Delay = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): FetchImplementation {
  return async (input, init) => {
    const method = requestMethod(input, init);
    // HEAD 沒有錯誤 JSON；改查零列保留 count/filter，才能精確辨識 JWT timing 錯誤。
    const url = new URL(input instanceof Request ? input.url : input.toString());
    // 此網站不用 Supabase Auth。SDK REST fallback 會把非 JWT key 放進 Bearer；
    // 僅移除與 apikey 完全相同的新格式 key，不移除真正使用者 JWT 或 legacy JWT。
    if (url.pathname.startsWith("/rest/v1/")) {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      const key = headers.get("apikey");
      if (key && /^(sb_secret_|sb_publishable_)/.test(key) && headers.get("authorization") === `Bearer ${key}`) {
        headers.delete("authorization");
        init = { ...init, headers };
      }
    }
    if (method === "HEAD" && url.pathname.startsWith("/rest/v1/") && !url.pathname.startsWith("/rest/v1/rpc/")) {
      url.searchParams.set("limit", "0");
      if (input instanceof Request) {
        input = new Request(url, new Request(input, { ...init, method: "GET" }));
        init = undefined;
      } else {
        input = url;
        init = { ...init, method: "GET" };
      }
    }
    const response = await fetchImplementation(input, init);

    if (
      method !== "GET" &&
      method !== "HEAD"
    ) {
      return retainErrorStatus(response, url);
    }

    if (!(await isFutureIssuedJwtFailure(response))) return retainErrorStatus(response, url);

    await delay(RETRY_DELAY_MS);
    // Next 的 render dedupe 不以 cache mode 區分 request；明確傳 signal 才跳過。
    // 保留呼叫者取消能力，且整條流程最多只新增一次網路請求。
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const retried = await fetchImplementation(input, {
      ...init,
      signal: signal ?? new AbortController().signal,
      cache: "no-store",
    });
    return retainErrorStatus(retried, url, true);
  };
}
