import "server-only";

type FetchImplementation = typeof fetch;
type Delay = (milliseconds: number) => Promise<void>;

const RETRY_DELAY_MS = 100;

/** SDK 將 HTTP response 拆成 error 後，Repository 通常只收到 error；保留實際狀態，避免猜測 code 對應值。 */
async function retainErrorStatus(response: Response, url: URL): Promise<Response> {
  if (response.ok || !url.pathname.startsWith("/rest/v1/")) return response;
  try {
    const body: unknown = await response.clone().json();
    if (!body || typeof body !== "object" || !("code" in body) || !("message" in body)) return response;
    const headers = new Headers(response.headers);
    headers.delete("content-length"); headers.delete("content-encoding");
    return new Response(JSON.stringify({ ...body, status: response.status }), { status: response.status, statusText: response.statusText, headers });
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
    // PostgREST HEAD errors have no JSON body. Request zero rows via GET so
    // the exact error can be classified while preserving count/filter semantics.
    const url = new URL(input instanceof Request ? input.url : input.toString());
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
    // Next render deduplication ignores cache mode; an explicit signal opts out.
    // Preserve caller cancellation while forcing this retry to reach the network.
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const retried = await fetchImplementation(input, {
      ...init,
      signal: signal ?? new AbortController().signal,
      cache: "no-store",
    });
    return retainErrorStatus(retried, url);
  };
}
