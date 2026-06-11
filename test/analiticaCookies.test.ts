import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCookieHeaderFromPlaywrightCookies,
  hasAnaliticaSessionCookie,
  loadPersistedAnaliticaCookieHeader,
  persistAnaliticaCookieHeader,
  xsrfHeaderFromCookie,
} from "../src/analitica/cookies.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("analiticaCookies", () => {
  it("builds and persists analitica cookie headers", () => {
    const dir = mkdtempSync(join(tmpdir(), "auvp-analitica-"));
    tempDirs.push(dir);
    const cookieFile = join(dir, "analitica-cookie");
    const env = { AUVP_ANALITICA_COOKIE_FILE: cookieFile };
    const header = "kc-id-token=abc; guest-id=xyz";

    const savedPath = persistAnaliticaCookieHeader(header, env);
    expect(savedPath).toBe(cookieFile);
    expect(loadPersistedAnaliticaCookieHeader(env)).toBe(header);
    expect(readFileSync(cookieFile, "utf8").trim()).toBe(header);
  });

  it("detects analitica session cookies", () => {
    expect(hasAnaliticaSessionCookie("kc-id-token=abc; guest-id=xyz")).toBe(
      true,
    );
    expect(
      hasAnaliticaSessionCookie("guest-id=xyz; KEYCLOAK_IDENTITY=abc"),
    ).toBe(false);
    expect(hasAnaliticaSessionCookie("_ga=1")).toBe(false);
  });

  it("builds cookie headers from playwright cookies", () => {
    const header = buildCookieHeaderFromPlaywrightCookies([
      {
        name: "kc-id-token",
        value: "token",
        domain: "analitica.auvp.com.br",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "ignored",
        value: "x",
        domain: "example.com",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    expect(header).toBe("kc-id-token=token");
  });

  it("extracts xsrf headers from cookie pairs", () => {
    expect(xsrfHeaderFromCookie("XSRF-TOKEN=abc%3D123")).toEqual({
      "X-XSRF-TOKEN": "abc=123",
    });
  });
});
