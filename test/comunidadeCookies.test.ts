import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  hasComunidadeSessionCookie,
  loadPersistedComunidadeCookieHeader,
  persistComunidadeCookieHeader,
} from "../src/comunidade/cookies.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("comunidadeCookies", () => {
  it("builds and persists comunidade cookie headers", () => {
    const dir = mkdtempSync(join(tmpdir(), "auvp-comunidade-"));
    tempDirs.push(dir);
    const cookieFile = join(dir, "comunidade-cookie");
    const env = { AUVP_COMUNIDADE_COOKIE_FILE: cookieFile };
    const header = "ips4_member_id=42385; ips4_login_key=abc";

    const savedPath = persistComunidadeCookieHeader(header, env);
    expect(savedPath).toBe(cookieFile);
    expect(loadPersistedComunidadeCookieHeader(env)).toBe(header);
    expect(readFileSync(cookieFile, "utf8").trim()).toBe(header);
  });

  it("detects comunidade session cookies", () => {
    expect(
      hasComunidadeSessionCookie("ips4_member_id=1; ips4_login_key=abc"),
    ).toBe(true);
    expect(hasComunidadeSessionCookie("ips4_member_id=1")).toBe(false);
  });
});
