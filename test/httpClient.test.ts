import { describe, expect, it, vi } from "vitest";
import { AuvpApiError } from "../src/core/errors.js";
import { AuvpFinancasClient, type FetchLike } from "../src/core/http-client.js";

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

describe("AuvpFinancasClient", () => {
  it("returns parsed JSON responses", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({ ok: true }),
    );
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: "https://example.test",
      extraHeaders: {},
    });

    await expect(client.get("/accounts")).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://example.test/accounts"),
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("sends PATCH requests with JSON body", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({ updated: true }),
    );
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: "https://example.test",
      extraHeaders: {},
    });

    await client.patch("/transactions/123", { tagIds: [1, 2] });

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://example.test/transactions/123"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ tagIds: [1, 2] }),
      }),
    );
  });

  it("sends persisted Analitica cookies and browser headers for Analitica requests", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({ ok: true }),
    );
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: "https://financas-api.example.test",
      origin: "https://financas.example.test",
      analiticaBaseUrl: "https://analitica.example.test",
      analiticaOrigin: "https://analitica.example.test",
      extraHeaders: {},
    });
    client.setAnaliticaCookieHeader("kc-id-token=abc; XSRF-TOKEN=xyz");

    await client.getAnalitica("/api/auth/me");

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://analitica.example.test/api/auth/me"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          origin: "https://analitica.example.test",
          referer: "https://analitica.example.test/",
          cookie: "kc-id-token=abc; XSRF-TOKEN=xyz",
          "X-XSRF-TOKEN": "xyz",
          "user-agent": expect.stringContaining("Chrome"),
        }),
      }),
    );

    const headers = vi.mocked(fetchImpl).mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >;
    expect(headers.authorization).toBeUndefined();
  });

  it("uses the Analitica base URL and origin for Analitica JSON requests", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({ ok: true }),
    );
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: "https://financas-api.example.test",
      origin: "https://financas.example.test",
      analiticaBaseUrl: "https://analitica.example.test",
      analiticaOrigin: "https://analitica.example.test",
      extraHeaders: {},
    });

    await client.getAnalitica("/api/views/most-viewed", {
      companyType: "BRA:stock",
      limit: 5,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(
        "https://analitica.example.test/api/views/most-viewed?companyType=BRA%3Astock&limit=5",
      ),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          origin: "https://analitica.example.test",
          referer: "https://analitica.example.test/",
        }),
      }),
    );
  });

  it("returns raw text for Analitica page route requests", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      new Response("rsc-payload", {
        status: 200,
        headers: { "content-type": "text/x-component" },
      }),
    );
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: "https://financas-api.example.test",
      origin: "https://financas.example.test",
      analiticaBaseUrl: "https://analitica.example.test",
      analiticaOrigin: "https://analitica.example.test",
      extraHeaders: {},
    });

    await expect(
      client.getAnaliticaText("/rankings/acoes", { _rsc: "19zvn" }),
    ).resolves.toBe("rsc-payload");
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://analitica.example.test/rankings/acoes?_rsc=19zvn"),
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "text/x-component, text/html, */*",
        }),
      }),
    );
  });

  it("captures Set-Cookie and sends the session cookie on later requests", async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        jsonResponse(
          { ok: true },
          {
            headers: {
              "set-cookie": "auvp_session=abc123; Path=/; HttpOnly",
            },
          },
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: "https://example.test",
      extraHeaders: {},
    });

    await client.get("/accounts");
    await client.get("/transactions");

    expect(client.getAuthStatus()).toEqual({
      hasBearerToken: false,
      hasSessionCookie: true,
      hasAnaliticaCookie: false,
      hasComunidadeCookie: false,
      cookieNames: ["auvp_session"],
    });
    expect(fetchImpl).toHaveBeenLastCalledWith(
      new URL("https://example.test/transactions"),
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: "auvp_session=abc123",
        }),
      }),
    );
  });

  it("returns null for empty 2xx responses", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      new Response("", { status: 200 }),
    );
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: "https://example.test",
      extraHeaders: {},
    });

    await expect(client.get("/empty")).resolves.toBeNull();
  });

  it("throws a descriptive error for non-2xx responses", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      new Response("nope", { status: 401 }),
    );
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: "https://example.test",
      extraHeaders: {},
    });

    await expect(client.get("/accounts")).rejects.toThrow(
      /HTTP 401.*accounts/,
    );
  });

  it("throws for invalid JSON responses", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      new Response("not json", { status: 200 }),
    );
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: "https://example.test",
      extraHeaders: {},
    });

    await expect(client.get("/accounts")).rejects.toThrow(/invalid JSON/);
  });

  it("throws a timeout error when the request is aborted", async () => {
    const fetchImpl: FetchLike = vi.fn((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: "https://example.test",
      extraHeaders: {},
      timeoutMs: 1,
    });

    await expect(client.get("/slow")).rejects.toThrow(AuvpApiError);
    await expect(client.get("/slow")).rejects.toThrow(/timed out/);
  });
});
