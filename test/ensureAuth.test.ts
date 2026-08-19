import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureAuth } from "../src/auth/ensure-auth.js";
import type { AuvpFinancasClient } from "../src/core/http-client.js";

vi.mock("../src/auth/browser-login.js", () => ({ runBrowserLogin: vi.fn() }));
import { runBrowserLogin } from "../src/auth/browser-login.js";

const tempDirs: string[] = [];
const previousEnv = new Map<string, string | undefined>();

afterEach(() => {
  for (const [key, value] of previousEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  previousEnv.clear();
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  vi.clearAllMocks();
});

function createToken(expOffsetSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expOffsetSeconds })).toString("base64url");
  return `${header}.${payload}.signature`;
}

function setupFiles(token: string): { dir: string; tokenFile: string } {
  const dir = mkdtempSync(join(tmpdir(), "auvp-ensure-"));
  tempDirs.push(dir);
  const tokenFile = join(dir, "access-token");
  writeFileSync(tokenFile, `${token}\n`, "utf8");
  setEnv("AUVP_FINANCAS_ACCESS_TOKEN_FILE", tokenFile);
  setEnv("AUVP_ANALITICA_COOKIE_FILE", join(dir, "analitica-cookie"));
  setEnv("AUVP_COMUNIDADE_COOKIE_FILE", join(dir, "comunidade-cookie"));
  setEnv("AUVP_CARTEIRA_ACCESS_TOKEN_FILE", join(dir, "carteira-token"));
  setEnv("AUVP_AUTH_LOGIN_LOCK_FILE", join(dir, "auth-login.lock"));
  return { dir, tokenFile };
}

function setEnv(key: string, value: string): void {
  if (!previousEnv.has(key)) previousEnv.set(key, process.env[key]);
  process.env[key] = value;
}

function createMockClient(statusOverrides: Record<string, boolean> = {}): AuvpFinancasClient {
  const status = {
    hasBearerToken: true,
    hasSessionCookie: false,
    hasAnaliticaCookie: false,
    hasComunidadeCookie: false,
    hasCarteiraToken: false,
    cookieNames: [],
    ...statusOverrides,
  };
  return {
    get: vi.fn().mockResolvedValue({ id: 1 }),
    getAnalitica: vi.fn().mockResolvedValue({ id: 1 }),
    getComunidadeText: vi.fn().mockResolvedValue("<html></html>"),
    getCarteira: vi.fn().mockResolvedValue({ _id: "user-1" }),
    setBearerToken: vi.fn(),
    setAnaliticaCookieHeader: vi.fn(),
    clearAnaliticaCookieHeader: vi.fn(),
    setComunidadeCookieHeader: vi.fn(),
    clearComunidadeCookieHeader: vi.fn(),
    setCarteiraToken: vi.fn(),
    clearCarteiraToken: vi.fn(),
    getAuthStatus: vi.fn().mockReturnValue(status),
  } as unknown as AuvpFinancasClient;
}

describe("ensureAuth", () => {
  it("reuses a valid Finanças token without opening a browser", async () => {
    setupFiles(createToken(3600));
    const client = createMockClient();
    const result = await ensureAuth(client, { interactive: false, modules: ["financas"] });
    expect(result.status).toBe("authenticated");
    expect(result.method).toBe("existing_token");
    expect(runBrowserLogin).not.toHaveBeenCalled();
  });

  it("validates only selected modules", async () => {
    setupFiles(createToken(3600));
    const client = createMockClient({ hasAnaliticaCookie: true });
    const result = await ensureAuth(client, {
      interactive: false,
      modules: ["financas", "analitica"],
    });
    expect(result.status).toBe("authenticated");
    expect(client.get).toHaveBeenCalledTimes(1);
    expect(client.getAnalitica).toHaveBeenCalledTimes(1);
    expect(client.getComunidadeText).not.toHaveBeenCalled();
    expect(client.getCarteira).not.toHaveBeenCalled();
  });

  it("tries silent renewal before reporting that login is required", async () => {
    setupFiles(createToken(-120));
    vi.mocked(runBrowserLogin).mockResolvedValue(undefined);
    const result = await ensureAuth(createMockClient(), {
      interactive: false,
      modules: ["financas"],
    });
    expect(result.status).toBe("login_required");
    expect(runBrowserLogin).toHaveBeenCalledWith(expect.objectContaining({ headless: true }));
  });

  it("opens one visible browser only after silent renewal fails", async () => {
    setupFiles(createToken(-120));
    vi.mocked(runBrowserLogin)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const result = await ensureAuth(createMockClient(), {
      interactive: true,
      modules: ["financas"],
    });
    expect(result.status).toBe("login_required");
    expect(result.method).toBe("interactive_browser");
    expect(runBrowserLogin).toHaveBeenNthCalledWith(1, expect.objectContaining({ headless: true }));
    expect(runBrowserLogin).toHaveBeenNthCalledWith(2, expect.objectContaining({ headless: false }));
  });
});
