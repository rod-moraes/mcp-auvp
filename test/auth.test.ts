import { describe, expect, it, vi } from "vitest";
import {
  buildCallbackUrl,
  completeSsoLogin,
  createSsoLoginUrl,
} from "../src/auth/sso.js";
import type { AuvpConfig } from "../src/core/config.js";
import { AuvpFinancasClient, type FetchLike } from "../src/core/http-client.js";

const config: AuvpConfig = {
  apiBaseUrl: "https://financas-api.example.test",
  origin: "https://financas.example.test",
  analiticaBaseUrl: "https://analitica.example.test",
  analiticaOrigin: "https://analitica.example.test",
  comunidadeBaseUrl: "https://comunidade.example.test",
  comunidadeOrigin: "https://comunidade.example.test",
  carteiraBaseUrl: "https://carteira-api.example.test",
  carteiraOrigin: "https://carteira.example.test",
  dicionarioBaseUrl: "https://dicionario.example.test",
  timeoutMs: 30_000,
  extraHeaders: {},
  ssoBaseUrl: "https://sso.example.test",
  ssoRealm: "AUVP",
  ssoClientId: "financas",
  ssoRedirectUri: "https://financas-api.example.test/auth/auvp/callback",
  ssoScope: "email profile openid",
};

describe("SSO auth helpers", () => {
  it("creates the AUVP SSO login URL from the API redirect endpoint", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValueOnce(
      new Response("", {
        status: 302,
        headers: {
          location:
            "https://sso.example.test/realms/AUVP/protocol/openid-connect/auth?client_id=financas&redirect_uri=https%3A%2F%2Ffinancas-api.example.test%2Fauth%2Fauvp%2Fcallback&response_type=code&scope=email+profile+openid&state=state-123",
        },
      }),
    );
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: config.apiBaseUrl,
      origin: config.origin,
      extraHeaders: {},
    });

    const result = await createSsoLoginUrl(client, {}, config);
    const url = new URL(result.loginUrl);

    expect(url.origin).toBe("https://sso.example.test");
    expect(url.searchParams.get("client_id")).toBe("financas");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://financas-api.example.test/auth/auvp/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("email profile openid");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://financas-api.example.test/auth/redirect-url?provider=auvp"),
      expect.objectContaining({ method: "GET", redirect: "manual" }),
    );
  });

  it("builds the callback URL from code and state", () => {
    const url = buildCallbackUrl(
      {
        code: "code-123",
        state: "state-123",
      },
      config,
    );

    expect(url.toString()).toBe(
      "https://financas-api.example.test/auth/auvp/callback?code=code-123&state=state-123",
    );
  });

  it("completes SSO login and stores callback cookies for later API calls", async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        new Response("", {
          status: 302,
          headers: {
            location: "https://financas.example.test/dashboard/home",
            "set-cookie": "auvp_session=abc123; Path=/; HttpOnly",
          },
        }),
      )
      .mockResolvedValueOnce(new Response("<html></html>", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: config.apiBaseUrl,
      origin: config.origin,
      extraHeaders: {},
    });

    const result = await completeSsoLogin(
      client,
      {
        code: "code-123",
        state: "state-123",
      },
      config,
    );
    await client.get("/accounts");

    expect(result).toMatchObject({
      status: 200,
      redirectCount: 1,
      hasSessionCookie: true,
      cookieNames: ["auvp_session"],
      capturedAuthMaterial: true,
    });
    expect(fetchImpl).toHaveBeenLastCalledWith(
      new URL("https://financas-api.example.test/accounts"),
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: "auvp_session=abc123",
        }),
      }),
    );
  });

  it("captures bearer tokens from JSON callback responses", async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "token-123",
            token_type: "Bearer",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    const client = new AuvpFinancasClient({
      fetchImpl,
      apiBaseUrl: config.apiBaseUrl,
      origin: config.origin,
      extraHeaders: {},
    });

    await completeSsoLogin(
      client,
      {
        callbackUrl:
          "https://financas-api.example.test/auth/auvp/callback?code=code-123&state=state-123",
      },
      config,
    );
    await client.get("/accounts");

    expect(client.getAuthStatus()).toMatchObject({
      hasBearerToken: true,
    });
    expect(fetchImpl).toHaveBeenLastCalledWith(
      new URL("https://financas-api.example.test/accounts"),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer token-123",
        }),
      }),
    );
  });
});
