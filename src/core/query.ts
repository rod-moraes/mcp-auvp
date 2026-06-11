export type QueryPrimitive = string | number | boolean;
export type QueryValue =
  | QueryPrimitive
  | readonly QueryPrimitive[]
  | null
  | undefined;

export type QueryParams = Record<string, QueryValue>;

export function buildQueryString(params: QueryParams = {}): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      const normalized = value
        .filter((item) => item !== "")
        .map((item) => String(item));

      if (normalized.length > 0) {
        searchParams.set(key, normalized.join(","));
      }

      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams.toString();
}

export function appendQueryParams(url: URL, params: QueryParams = {}): void {
  const queryString = buildQueryString(params);

  if (queryString.length === 0) {
    return;
  }

  const queryParams = new URLSearchParams(queryString);
  for (const [key, value] of queryParams.entries()) {
    url.searchParams.set(key, value);
  }
}
