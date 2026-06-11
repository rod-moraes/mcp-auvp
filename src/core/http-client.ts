import {
  ANALITICA_BROWSER_UA,
  xsrfHeaderFromCookie,
} from "../analitica/cookies.js";
import type { QueryParams } from "./query.js";
import { appendQueryParams } from "./query.js";
import { AuvpApiError } from "./errors.js";
import type { AuvpConfig, StringHeaders } from "./config.js";
import { loadConfigFromEnv } from "./config.js";

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface AuvpFinancasClientOptions {
  apiBaseUrl?: string;
  origin?: string;
  analiticaBaseUrl?: string;
  analiticaOrigin?: string;
  comunidadeBaseUrl?: string;
  comunidadeOrigin?: string;
  timeoutMs?: number;
  extraHeaders?: StringHeaders;
  fetchImpl?: FetchLike;
  initialCookieHeader?: string;
}

interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  baseUrl?: URL;
  origin?: string;
  accept?: string;
  responseType?: "json" | "text";
  extraHeaders?: StringHeaders;
  timeoutMs?: number;
}

export class AuvpFinancasClient {
  private readonly apiBaseUrl: URL;
  private readonly origin: string;
  private readonly analiticaBaseUrl: URL;
  private readonly analiticaOrigin: string;
  private readonly comunidadeBaseUrl: URL;
  private readonly comunidadeOrigin: string;
  private readonly timeoutMs: number;
  private readonly extraHeaders: StringHeaders;
  private readonly fetchImpl: FetchLike;
  private readonly cookieJar = new Map<string, string>();
  private bearerToken?: string;
  private analiticaCookieHeader?: string;
  private comunidadeCookieHeader?: string;

  constructor(options: AuvpFinancasClientOptions = {}) {
    const envConfig = loadConfigFromEnv();

    this.apiBaseUrl = new URL(options.apiBaseUrl ?? envConfig.apiBaseUrl);
    this.origin = options.origin ?? envConfig.origin;
    this.analiticaBaseUrl = new URL(
      options.analiticaBaseUrl ?? envConfig.analiticaBaseUrl,
    );
    this.analiticaOrigin =
      options.analiticaOrigin ?? envConfig.analiticaOrigin;
    this.comunidadeBaseUrl = new URL(
      options.comunidadeBaseUrl ?? envConfig.comunidadeBaseUrl,
    );
    this.comunidadeOrigin =
      options.comunidadeOrigin ?? envConfig.comunidadeOrigin;
    this.timeoutMs = options.timeoutMs ?? envConfig.timeoutMs;
    this.extraHeaders = options.extraHeaders ?? envConfig.extraHeaders;
    this.fetchImpl = options.fetchImpl ?? fetch;

    if (options.initialCookieHeader) {
      this.setSessionCookieHeader(options.initialCookieHeader);
    }
  }

  async get(path: string, query?: QueryParams): Promise<unknown> {
    return this.request("GET", path, { query });
  }

  async post(path: string, body: unknown, query?: QueryParams): Promise<unknown> {
    return this.request("POST", path, { body, query });
  }

  async patch(path: string, body: unknown): Promise<unknown> {
    return this.request("PATCH", path, { body });
  }

  async delete(path: string, query?: QueryParams): Promise<unknown> {
    return this.request("DELETE", path, { query });
  }

  async getAnalitica(path: string, query?: QueryParams): Promise<unknown> {
    return this.request("GET", path, {
      query,
      baseUrl: this.analiticaBaseUrl,
      origin: this.analiticaOrigin,
    });
  }

  async postAnalitica(
    path: string,
    body: unknown,
    query?: QueryParams,
  ): Promise<unknown> {
    return this.request("POST", path, {
      query,
      body,
      baseUrl: this.analiticaBaseUrl,
      origin: this.analiticaOrigin,
    });
  }

  async getAnaliticaText(
    path: string,
    query?: QueryParams,
    options: Pick<RequestOptions, "timeoutMs"> = {},
  ): Promise<string> {
    return this.request("GET", path, {
      query,
      baseUrl: this.analiticaBaseUrl,
      origin: this.analiticaOrigin,
      accept: "text/x-component, text/html, */*",
      responseType: "text",
      timeoutMs: options.timeoutMs,
    }) as Promise<string>;
  }

  async getComunidade(path: string, query?: QueryParams): Promise<unknown> {
    return this.request("GET", path, {
      query,
      baseUrl: this.comunidadeBaseUrl,
      origin: this.comunidadeOrigin,
      accept: "*/*",
      extraHeaders: {
        "x-requested-with": "XMLHttpRequest",
      },
    });
  }

  async getComunidadeText(path: string, query?: QueryParams): Promise<string> {
    return this.request("GET", path, {
      query,
      baseUrl: this.comunidadeBaseUrl,
      origin: this.comunidadeOrigin,
      accept: "text/html,application/xhtml+xml,*/*",
      responseType: "text",
    }) as Promise<string>;
  }

  async getComunidadeAjaxText(
    path: string,
    query?: QueryParams,
  ): Promise<string> {
    return this.request("GET", path, {
      query,
      baseUrl: this.comunidadeBaseUrl,
      origin: this.comunidadeOrigin,
      accept: "*/*",
      responseType: "text",
      extraHeaders: {
        "x-requested-with": "XMLHttpRequest",
      },
    }) as Promise<string>;
  }

  async fetchRaw(
    input: string | URL,
    init: RequestInit & { headers?: StringHeaders } = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const method = init.method ?? "GET";
    const url = input instanceof URL ? input.toString() : input;

    try {
      const response = await this.fetchImpl(input, {
        ...init,
        headers: this.buildHeaders(init.headers),
        signal: controller.signal,
      });

      this.storeSetCookieHeaders(extractSetCookieHeaders(response.headers));

      return response;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new AuvpApiError(
          `AUVP API request timed out after ${this.timeoutMs}ms: ${method} ${url}.`,
          { url, cause: error },
        );
      }

      throw new AuvpApiError(`AUVP API request failed: ${method} ${url}.`, {
        url,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  setBearerToken(token: string): void {
    this.bearerToken = token;
  }

  getBearerToken(): string | undefined {
    return this.bearerToken;
  }

  setAnaliticaCookieHeader(cookieHeader: string): void {
    this.analiticaCookieHeader = cookieHeader;
  }

  clearAnaliticaCookieHeader(): void {
    this.analiticaCookieHeader = undefined;
  }

  getAnaliticaCookieHeader(): string | undefined {
    return this.analiticaCookieHeader;
  }

  setComunidadeCookieHeader(cookieHeader: string): void {
    this.comunidadeCookieHeader = cookieHeader;
  }

  clearComunidadeCookieHeader(): void {
    this.comunidadeCookieHeader = undefined;
  }

  getComunidadeCookieHeader(): string | undefined {
    return this.comunidadeCookieHeader;
  }

  setSessionCookieHeader(cookieHeader: string): string[] {
    const names: string[] = [];

    for (const cookiePair of cookieHeader.split(";")) {
      const parsed = parseCookiePair(cookiePair.trim());
      if (!parsed) {
        continue;
      }

      this.cookieJar.set(parsed.name, parsed.value);
      names.push(parsed.name);
    }

    return names;
  }

  storeSetCookieHeaders(setCookieHeaders: readonly string[]): string[] {
    const names: string[] = [];

    for (const setCookieHeader of setCookieHeaders) {
      const [cookiePair = "", ...attributeParts] = setCookieHeader.split(";");
      const parsed = parseCookiePair(cookiePair.trim());
      if (!parsed) {
        continue;
      }

      const shouldDelete =
        parsed.value.length === 0 ||
        attributeParts.some((attribute) =>
          /^max-age=0$/i.test(attribute.trim()),
        );

      if (shouldDelete) {
        this.cookieJar.delete(parsed.name);
      } else {
        this.cookieJar.set(parsed.name, parsed.value);
      }

      names.push(parsed.name);
    }

    return names;
  }

  getAuthStatus(): {
    hasBearerToken: boolean;
    hasSessionCookie: boolean;
    hasAnaliticaCookie: boolean;
    hasComunidadeCookie: boolean;
    cookieNames: string[];
  } {
    return {
      hasBearerToken: this.bearerToken !== undefined,
      hasSessionCookie: this.cookieJar.size > 0,
      hasAnaliticaCookie: Boolean(
        this.analiticaCookieHeader && this.analiticaCookieHeader.length > 0,
      ),
      hasComunidadeCookie: Boolean(
        this.comunidadeCookieHeader && this.comunidadeCookieHeader.length > 0,
      ),
      cookieNames: this.getSessionCookieNames(),
    };
  }

  getSessionCookieNames(): string[] {
    return [...this.cookieJar.keys()].sort();
  }

  private async request(
    method: "GET" | "PATCH" | "POST" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<unknown> {
    const baseUrl = options.baseUrl ?? this.apiBaseUrl;
    const url = new URL(path, baseUrl);
    appendQueryParams(url, options.query);

    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = this.buildHeaders(
        {
          ...(options.accept ? { accept: options.accept } : {}),
          ...options.extraHeaders,
        },
        method !== "GET",
        options.origin,
      );

      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (method !== "GET" && method !== "DELETE") {
        init.body = JSON.stringify(options.body ?? {});
      }

      const response = await this.fetchImpl(url, init);
      this.storeSetCookieHeaders(extractSetCookieHeaders(response.headers));
      const responseText = await response.text();

      if (!response.ok) {
        throw new AuvpApiError(
          buildHttpErrorMessage(response.status, url.toString(), responseText),
          {
            status: response.status,
            url: url.toString(),
            responseBody: responseText,
          },
        );
      }

      if (responseText.trim().length === 0) {
        return null;
      }

      if (options.responseType === "text") {
        return responseText;
      }

      try {
        return JSON.parse(responseText) as unknown;
      } catch (error) {
        throw new AuvpApiError(
          `AUVP API returned invalid JSON for ${method} ${url.toString()}.`,
          {
            status: response.status,
            url: url.toString(),
            responseBody: responseText,
            cause: error,
          },
        );
      }
    } catch (error) {
      if (error instanceof AuvpApiError) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new AuvpApiError(
          `AUVP API request timed out after ${timeoutMs}ms: ${method} ${url.toString()}.`,
          { url: url.toString(), cause: error },
        );
      }

      throw new AuvpApiError(
        `AUVP API request failed: ${method} ${url.toString()}.`,
        { url: url.toString(), cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(
    overrides: StringHeaders = {},
    includeJsonContentType = false,
    originOverride?: string,
  ): StringHeaders {
    const origin = originOverride ?? this.origin;
    const isAnaliticaRequest = origin === this.analiticaOrigin;
    const isComunidadeRequest = origin === this.comunidadeOrigin;
    const headers: StringHeaders = {
      accept: isComunidadeRequest
        ? "*/*"
        : isAnaliticaRequest
          ? "application/json, text/plain, */*"
          : "application/json",
      "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      origin,
      referer: `${origin}/`,
      ...this.extraHeaders,
      ...overrides,
    };

    if (includeJsonContentType && !hasHeader(headers, "content-type")) {
      headers["content-type"] = "application/json";
    }

    if (isAnaliticaRequest) {
      headers["user-agent"] = ANALITICA_BROWSER_UA;
      headers["sec-fetch-dest"] = "empty";
      headers["sec-fetch-mode"] = "cors";
      headers["sec-fetch-site"] = "same-origin";

      if (this.analiticaCookieHeader && !hasHeader(headers, "cookie")) {
        headers.cookie = this.analiticaCookieHeader;
        Object.assign(headers, xsrfHeaderFromCookie(this.analiticaCookieHeader));
      }

      return headers;
    }

    if (isComunidadeRequest) {
      headers["user-agent"] = ANALITICA_BROWSER_UA;
      headers["sec-fetch-dest"] = "empty";
      headers["sec-fetch-mode"] = "cors";
      headers["sec-fetch-site"] = "same-origin";

      if (this.comunidadeCookieHeader && !hasHeader(headers, "cookie")) {
        headers.cookie = this.comunidadeCookieHeader;
      }

      return headers;
    }

    if (this.bearerToken && !hasHeader(headers, "authorization")) {
      headers.authorization = `Bearer ${this.bearerToken}`;
    }

    const cookieHeader = this.getSessionCookieHeader();
    if (cookieHeader && !hasHeader(headers, "cookie")) {
      headers.cookie = cookieHeader;
    }

    return headers;
  }

  private getSessionCookieHeader(): string {
    return [...this.cookieJar.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

function buildHttpErrorMessage(
  status: number,
  url: string,
  responseText: string,
): string {
  const bodyPreview =
    responseText.trim().length > 0
      ? ` Body: ${responseText.trim().slice(0, 500)}`
      : "";

  if (status === 429) {
    return `AUVP API rate limit reached for ${url}.${bodyPreview}`;
  }

  return `AUVP API returned HTTP ${status} for ${url}.${bodyPreview}`;
}

export function extractSetCookieHeaders(headers: Headers): string[] {
  const headersWithCookies = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookieHeaders = headersWithCookies.getSetCookie?.();

  if (setCookieHeaders && setCookieHeaders.length > 0) {
    return setCookieHeaders;
  }

  const combinedSetCookieHeader = headers.get("set-cookie");
  if (!combinedSetCookieHeader) {
    return [];
  }

  return combinedSetCookieHeader.split(/,(?=\s*[^;,]+=)/).map((value) =>
    value.trim(),
  );
}

function parseCookiePair(
  cookiePair: string,
): { name: string; value: string } | undefined {
  const separatorIndex = cookiePair.indexOf("=");

  if (separatorIndex <= 0) {
    return undefined;
  }

  return {
    name: cookiePair.slice(0, separatorIndex).trim(),
    value: cookiePair.slice(separatorIndex + 1).trim(),
  };
}

function hasHeader(headers: StringHeaders, name: string): boolean {
  const lowerName = name.toLowerCase();
  return Object.keys(headers).some((headerName) =>
    headerName.toLowerCase() === lowerName,
  );
}
