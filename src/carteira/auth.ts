import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import type { AuvpFinancasClient } from "../core/http-client.js";
import { getDefaultAuthDir } from "../auth/storage.js";

const DEFAULT_CARTEIRA_TOKEN_FILE = join(
  getDefaultAuthDir(),
  "carteira-token",
);

export const CARTEIRA_HOME_URL = "https://ferramentas.auvp.com.br/carteira";
export const CARTEIRA_LOCAL_STORAGE_KEY = "auvp-web@token";

export function getCarteiraTokenFilePath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const customPath = env.AUVP_CARTEIRA_ACCESS_TOKEN_FILE?.trim();
  return customPath ? resolve(customPath) : DEFAULT_CARTEIRA_TOKEN_FILE;
}

export function loadPersistedCarteiraToken(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const inline = env.AUVP_CARTEIRA_ACCESS_TOKEN?.trim();
  if (inline) {
    return inline.replace(/^Bearer\s+/i, "").trim();
  }

  const path = getCarteiraTokenFilePath(env);
  if (!existsSync(path)) {
    return undefined;
  }

  const token = readFileSync(path, "utf8").trim();
  return token ? token.replace(/^Bearer\s+/i, "").trim() : undefined;
}

export function persistCarteiraToken(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const normalized = token.replace(/^Bearer\s+/i, "").trim();
  if (!normalized) {
    throw new Error("Cannot persist an empty Carteira token.");
  }

  const path = getCarteiraTokenFilePath(env);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${normalized}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Best effort on filesystems without POSIX permissions.
  }
  return path;
}

export function syncCarteiraTokenFromDisk(
  client: AuvpFinancasClient,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const token = loadPersistedCarteiraToken(env);
  if (token) {
    client.setCarteiraToken(token);
  }
}

