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
    const response = await fetchImplementation(input, init);
    const method = requestMethod(input, init);

    if (
      method !== "GET" &&
      method !== "HEAD"
    ) {
      return response;
    }

    if (!(await isFutureIssuedJwtFailure(response))) return response;

    await delay(RETRY_DELAY_MS);
    return fetchImplementation(input, init);
  };
}
