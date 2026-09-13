import "server-only";

type FetchImplementation = typeof fetch;
type Delay = (milliseconds: number) => Promise<void>;

const RETRY_DELAY_MS = 100;

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
      return response;
    }

    if (!(await isFutureIssuedJwtFailure(response))) return response;

    await delay(RETRY_DELAY_MS);
    // Next render deduplication ignores cache mode; an explicit signal opts out.
    // Preserve caller cancellation while forcing this retry to reach the network.
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    return fetchImplementation(input, {
      ...init,
      signal: signal ?? new AbortController().signal,
      cache: "no-store",
    });
  };
}
