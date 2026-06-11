import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { AuvpConfigError } from "../core/errors.js";
import type { AuvpFinancasClient } from "../core/http-client.js";

const DEFAULT_DIR = join(homedir(), ".auvp-financas");
const DEFAULT_TOKEN_FILE = join(DEFAULT_DIR, "access-token");
const DEFAULT_PROFILE_DIR = join(DEFAULT_DIR, "browser-profile");
const DEFAULT_STORAGE_STATE = join(DEFAULT_DIR, "storage-state.json");

export function getDefaultAuthDir(): string {
  return DEFAULT_DIR;
}

export function getTokenFilePath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const envPath = env.AUVP_FINANCAS_ACCESS_TOKEN_FILE?.trim();
  return envPath ? resolve(envPath) : DEFAULT_TOKEN_FILE;
}

export function getBrowserProfileDir(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const envPath = env.AUVP_FINANCAS_BROWSER_PROFILE_DIR?.trim();
  return envPath ? resolve(envPath) : DEFAULT_PROFILE_DIR;
}

export function getStorageStatePath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const envPath = env.AUVP_FINANCAS_STORAGE_STATE_FILE?.trim();
  return envPath ? resolve(envPath) : DEFAULT_STORAGE_STATE;
}

export function loadPersistedBearerToken(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const inline = env.AUVP_FINANCAS_ACCESS_TOKEN?.trim();
  if (inline) {
    return stripBearerPrefix(inline);
  }

  const filePath = getTokenFilePath(env);
  if (!existsSync(filePath)) {
    return undefined;
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8").trim();
  } catch {
    throw new AuvpConfigError(
      `Could not read AUVP_FINANCAS_ACCESS_TOKEN_FILE at ${filePath}.`,
    );
  }

  if (raw.length === 0) {
    throw new AuvpConfigError(
      `AUVP_FINANCAS_ACCESS_TOKEN_FILE at ${filePath} is empty.`,
    );
  }

  return stripBearerPrefix(raw);
}

export function persistBearerToken(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const normalized = stripBearerPrefix(token);
  if (normalized.length === 0) {
    throw new AuvpConfigError("Cannot persist an empty bearer token.");
  }

  const filePath = getTokenFilePath(env);
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, `${normalized}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(filePath, 0o600);
  } catch {
    /* ignore */
  }

  return filePath;
}

export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | undefined {
  const parts = stripBearerPrefix(token).split(".");
  if (parts.length < 2) {
    return undefined;
  }

  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(payload);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export function isBearerTokenExpired(
  token: string,
  skewSeconds = 60,
): boolean | undefined {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return undefined;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds >= exp - skewSeconds;
}

function stripBearerPrefix(value: string): string {
  return value.replace(/^Bearer\s+/i, "").trim();
}

/** Re-reads token from env/file so login flows work without restarting MCP. */
export function syncBearerTokenFromDisk(
  client: AuvpFinancasClient,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const token = loadPersistedBearerToken(env);
  if (token) {
    client.setBearerToken(token);
  }
}
