import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { Cookie } from "playwright";
import { AuvpConfigError } from "../core/errors.js";

const DEFAULT_DIR = join(homedir(), ".auvp-financas");
const DEFAULT_ANALITICA_COOKIE_FILE = join(DEFAULT_DIR, "analitica-cookie");

export const ANALITICA_ORIGIN = "https://analitica.auvp.com.br";
export const ANALITICA_HOME_URL = `${ANALITICA_ORIGIN}/`;

export const ANALITICA_BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function getAnaliticaCookieFilePath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const envPath = env.AUVP_ANALITICA_COOKIE_FILE?.trim();
  if (envPath) {
    return expandPath(envPath);
  }

  const legacyPath = env.ANALITICA_COOKIE_FILE?.trim();
  if (legacyPath) {
    return expandPath(legacyPath);
  }

  return DEFAULT_ANALITICA_COOKIE_FILE;
}

function expandPath(filePath: string): string {
  const trimmed = filePath.trim();
  if (trimmed.startsWith("~/") || trimmed === "~") {
    return trimmed === "~" ? homedir() : join(homedir(), trimmed.slice(2));
  }
  return resolve(trimmed);
}

function normalizeCookieString(value: string): string {
  return value.replace(/\r\n/g, "\n").split("\n")[0].trim();
}

export function isAuvpCookieDomain(domain: string): boolean {
  const normalized = domain.replace(/^\./, "");
  return (
    normalized === "auvp.com.br" ||
    normalized.endsWith(".auvp.com.br") ||
    normalized.includes("analitica.auvp")
  );
}

export function buildCookieHeaderFromPlaywrightCookies(
  cookies: readonly Cookie[],
): string {
  const relevant = cookies.filter((cookie) => isAuvpCookieDomain(cookie.domain));
  return relevant.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

export function hasAnaliticaSessionCookie(cookieHeader: string): boolean {
  const names = new Set(
    cookieHeader
      .split(";")
      .map((segment) => segment.trim().split("=")[0])
      .filter(Boolean),
  );

  return names.has("kc-id-token") || names.has("analitica-token");
}

export function parseCookiePairs(cookie: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const segment of cookie.split(";")) {
    const idx = segment.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const name = segment.slice(0, idx).trim();
    const value = segment.slice(idx + 1).trim();
    if (name) {
      out[name] = value;
    }
  }
  return out;
}

export function xsrfHeaderFromCookie(cookie: string): Record<string, string> {
  const pairs = parseCookiePairs(cookie);
  const tryNames = [
    "XSRF-TOKEN",
    "xsrf-token",
    "X-XSRF-TOKEN",
    "csrf-token",
    "_csrf",
  ];

  for (const name of tryNames) {
    const value = pairs[name];
    if (value) {
      try {
        return { "X-XSRF-TOKEN": decodeURIComponent(value) };
      } catch {
        return { "X-XSRF-TOKEN": value };
      }
    }
  }

  for (const [name, value] of Object.entries(pairs)) {
    const lower = name.toLowerCase();
    if (lower.includes("xsrf") || lower === "csrf") {
      try {
        return { "X-XSRF-TOKEN": decodeURIComponent(value) };
      } catch {
        return { "X-XSRF-TOKEN": value };
      }
    }
  }

  return {};
}

export function loadPersistedAnaliticaCookieHeader(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const inline =
    env.AUVP_ANALITICA_COOKIE?.trim() ?? env.ANALITICA_COOKIE?.trim();
  if (inline) {
    return normalizeCookieString(inline);
  }

  const filePath = getAnaliticaCookieFilePath(env);
  if (!existsSync(filePath)) {
    return undefined;
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) {
      raw = raw.slice(1);
    }
    raw = raw.trim();
  } catch {
    throw new AuvpConfigError(
      `Could not read Analitica cookie file at ${filePath}.`,
    );
  }

  return raw.length > 0 ? normalizeCookieString(raw) : undefined;
}

export function persistAnaliticaCookieHeader(
  cookieHeader: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const normalized = normalizeCookieString(cookieHeader);
  if (normalized.length === 0) {
    throw new AuvpConfigError("Cannot persist an empty Analitica cookie header.");
  }

  const filePath = getAnaliticaCookieFilePath(env);
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, `${normalized}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(filePath, 0o600);
  } catch {
    /* ignore */
  }

  return filePath;
}

export function syncAnaliticaCookieFromDisk(
  client: {
    setAnaliticaCookieHeader: (cookieHeader: string) => void;
    clearAnaliticaCookieHeader: () => void;
  },
  env: NodeJS.ProcessEnv = process.env,
): void {
  const cookieHeader = loadPersistedAnaliticaCookieHeader(env);
  if (cookieHeader) {
    client.setAnaliticaCookieHeader(cookieHeader);
  } else {
    client.clearAnaliticaCookieHeader();
  }
}
