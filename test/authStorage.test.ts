import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  isBearerTokenExpired,
  loadPersistedBearerToken,
  persistBearerToken,
} from "../src/auth/storage.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
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

describe("authStorage", () => {
  it("persists and reloads bearer tokens", () => {
    const dir = mkdtempSync(join(tmpdir(), "auvp-auth-"));
    tempDirs.push(dir);
    const tokenFile = join(dir, "access-token");
    const env = { AUVP_FINANCAS_ACCESS_TOKEN_FILE: tokenFile };
    const token = createToken(3600);

    const savedPath = persistBearerToken(token, env);
    expect(savedPath).toBe(tokenFile);
    expect(readFileSync(tokenFile, "utf8").trim()).toBe(token);
    expect(loadPersistedBearerToken(env)).toBe(token);
  });

  it("detects expired JWTs", () => {
    expect(isBearerTokenExpired(createToken(-120))).toBe(true);
    expect(isBearerTokenExpired(createToken(3600))).toBe(false);
    expect(isBearerTokenExpired("not-a-jwt")).toBeUndefined();
  });

  it("strips Bearer prefix before persisting", () => {
    const dir = mkdtempSync(join(tmpdir(), "auvp-auth-"));
    tempDirs.push(dir);
    const tokenFile = join(dir, "access-token");
    const env = { AUVP_FINANCAS_ACCESS_TOKEN_FILE: tokenFile };
    const token = createToken(3600);

    persistBearerToken(`Bearer ${token}`, env);
    expect(loadPersistedBearerToken(env)).toBe(token);
  });
});
