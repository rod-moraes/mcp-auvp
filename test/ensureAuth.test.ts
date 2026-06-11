import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureAuth } from "../src/auth/ensure-auth.js";
import { AuvpApiError } from "../src/core/errors.js";
import type { AuvpFinancasClient } from "../src/core/http-client.js";

vi.mock("../src/auth/browser-login.js", () => ({
  runBrowserLogin: vi.fn(),
  refreshSecondarySiteCookies: vi.fn().mockResolvedValue({}),
}));

import {
  refreshSecondarySiteCookies,
  runBrowserLogin,
} from "../src/auth/browser-login.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
  vi.clearAllMocks();
});

function createToken(expOffsetSeconds: number): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: 1,
      exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
    }),
  ).toString("base64url");
  return `${header}.${payload}.signature`;
}

function createMockClient(): AuvpFinancasClient {
  return {
    get: vi.fn(),
    setAnaliticaCookieHeader: vi.fn(),
    clearAnaliticaCookieHeader: vi.fn(),
    setComunidadeCookieHeader: vi.fn(),
    clearComunidadeCookieHeader: vi.fn(),
    getAuthStatus: vi.fn().mockReturnValue({
      hasBearerToken: true,
      hasSessionCookie: false,
      hasAnaliticaCookie: false,
      hasComunidadeCookie: false,
      cookieNames: [],
    }),
    setBearerToken: vi.fn(),
    getBearerToken: vi.fn(),
  } as unknown as AuvpFinancasClient;
}

describe("ensureAuth", () => {
  it("fails when Finanças is valid but secondary cookies are missing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "auvp-ensure-"));
    tempDirs.push(dir);
    const tokenFile = join(dir, "access-token");
    const token = createToken(3600);
    writeFileSync(tokenFile, `${token}\n`, "utf8");

    const previous = process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE;
    process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE = tokenFile;

    const client = createMockClient();
    client.setBearerToken(token);
    vi.mocked(client.get).mockResolvedValue({ id: 1 });

    const result = await ensureAuth(client, { interactive: false });

    expect(result.status).toBe("failed");
    expect(result.method).toBe("existing_token");
    expect(result.message).toContain("Analítica");
    expect(result.message).toContain("Comunidade");
    expect(refreshSecondarySiteCookies).toHaveBeenCalledTimes(1);
    expect(refreshSecondarySiteCookies).toHaveBeenCalledWith({ headless: true });
    expect(runBrowserLogin).not.toHaveBeenCalled();

    process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE = previous;
  });

  it("returns authenticated only when Finanças, Analítica and Comunidade are present", async () => {
    const dir = mkdtempSync(join(tmpdir(), "auvp-ensure-"));
    tempDirs.push(dir);
    const tokenFile = join(dir, "access-token");
    const token = createToken(3600);
    writeFileSync(tokenFile, `${token}\n`, "utf8");

    const previous = process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE;
    process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE = tokenFile;

    const client = createMockClient();
    client.setBearerToken(token);
    vi.mocked(client.get).mockResolvedValue({ id: 1 });
    vi.mocked(client.getAuthStatus).mockReturnValue({
      hasBearerToken: true,
      hasSessionCookie: false,
      hasAnaliticaCookie: true,
      hasComunidadeCookie: true,
      cookieNames: [],
    });

    const result = await ensureAuth(client, { interactive: false });

    expect(result.status).toBe("authenticated");
    expect(result.method).toBe("existing_token");
    expect(runBrowserLogin).not.toHaveBeenCalled();

    process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE = previous;
  });

  it("opens the browser when secondary cookies are missing and interactive is true", async () => {
    const dir = mkdtempSync(join(tmpdir(), "auvp-ensure-"));
    tempDirs.push(dir);
    const tokenFile = join(dir, "access-token");
    const token = createToken(3600);
    writeFileSync(tokenFile, `${token}\n`, "utf8");

    const previous = process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE;
    process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE = tokenFile;

    const client = createMockClient();
    client.setBearerToken(token);
    vi.mocked(client.get).mockResolvedValue({ id: 1 });
    vi.mocked(refreshSecondarySiteCookies).mockResolvedValueOnce({});

    const result = await ensureAuth(client, { interactive: true });

    expect(refreshSecondarySiteCookies).toHaveBeenCalledTimes(1);
    expect(refreshSecondarySiteCookies).toHaveBeenCalledWith({
      headless: false,
    });
    expect(result.status).toBe("login_required");
    expect(result.method).toBe("interactive_browser");
    expect(runBrowserLogin).not.toHaveBeenCalled();

    process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE = previous;
  });

  it("falls back to silent browser renewal when the API returns 401", async () => {
    const dir = mkdtempSync(join(tmpdir(), "auvp-ensure-"));
    tempDirs.push(dir);
    const tokenFile = join(dir, "access-token");
    const expiredToken = createToken(-120);
    writeFileSync(tokenFile, `${expiredToken}\n`, "utf8");

    const previous = process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE;
    process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE = tokenFile;

    const renewedToken = createToken(3600);
    vi.mocked(runBrowserLogin).mockResolvedValueOnce({
      token: renewedToken,
      tokenFile,
      profileDir: join(dir, "browser-profile"),
      method: "silent_browser",
      analiticaCookieCaptured: true,
      analiticaCookieFile: join(dir, "analitica-cookie"),
      comunidadeCookieCaptured: true,
      comunidadeCookieFile: join(dir, "comunidade-cookie"),
    });

    const client = createMockClient();
    client.setBearerToken(expiredToken);
    vi.mocked(client.get).mockResolvedValueOnce({ id: 1 });
    vi.mocked(client.getAuthStatus).mockReturnValue({
      hasBearerToken: true,
      hasSessionCookie: false,
      hasAnaliticaCookie: true,
      hasComunidadeCookie: true,
      cookieNames: [],
    });

    const result = await ensureAuth(client, { interactive: false });

    expect(result.status).toBe("authenticated");
    expect(result.method).toBe("silent_browser");
    expect(client.setBearerToken).toHaveBeenCalled();

    process.env.AUVP_FINANCAS_ACCESS_TOKEN_FILE = previous;
  });
});
