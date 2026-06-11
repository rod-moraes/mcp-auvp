import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { AuvpConfigError } from "../core/errors.js";

const DEFAULT_DIR = join(homedir(), ".auvp-financas");
const DEFAULT_COMUNIDADE_COOKIE_FILE = join(DEFAULT_DIR, "comunidade-cookie");

export const COMUNIDADE_ORIGIN = "https://comunidade.auvp.com.br";
export const COMUNIDADE_HOME_URL = `${COMUNIDADE_ORIGIN}/`;

export function getComunidadeCookieFilePath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const envPath = env.AUVP_COMUNIDADE_COOKIE_FILE?.trim();
  if (envPath) {
    return expandPath(envPath);
  }

  return DEFAULT_COMUNIDADE_COOKIE_FILE;
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

export function hasComunidadeSessionCookie(cookieHeader: string): boolean {
  const names = new Set(
    cookieHeader
      .split(";")
      .map((segment) => segment.trim().split("=")[0])
      .filter(Boolean),
  );

  return names.has("ips4_member_id") && names.has("ips4_login_key");
}

export function loadPersistedComunidadeCookieHeader(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const inline = env.AUVP_COMUNIDADE_COOKIE?.trim();
  if (inline) {
    return normalizeCookieString(inline);
  }

  const filePath = getComunidadeCookieFilePath(env);
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
      `Could not read Comunidade cookie file at ${filePath}.`,
    );
  }

  return raw.length > 0 ? normalizeCookieString(raw) : undefined;
}

export function persistComunidadeCookieHeader(
  cookieHeader: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const normalized = normalizeCookieString(cookieHeader);
  if (normalized.length === 0) {
    throw new AuvpConfigError(
      "Cannot persist an empty Comunidade cookie header.",
    );
  }

  const filePath = getComunidadeCookieFilePath(env);
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, `${normalized}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(filePath, 0o600);
  } catch {
    /* ignore */
  }

  return filePath;
}

export function syncComunidadeCookieFromDisk(
  client: {
    setComunidadeCookieHeader: (cookieHeader: string) => void;
    clearComunidadeCookieHeader: () => void;
  },
  env: NodeJS.ProcessEnv = process.env,
): void {
  const cookieHeader = loadPersistedComunidadeCookieHeader(env);
  if (cookieHeader) {
    client.setComunidadeCookieHeader(cookieHeader);
  } else {
    client.clearComunidadeCookieHeader();
  }
}
