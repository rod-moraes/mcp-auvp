import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { getDefaultAuthDir } from "./storage.js";

const DEFAULT_STALE_MS = 15 * 60_000;
const DEFAULT_WAIT_MS = 10 * 60_000;

export interface AuthLoginLock {
  path: string;
  owner: string;
  release(): void;
}

export function getAuthLoginLockPath(env: NodeJS.ProcessEnv = process.env): string {
  const customPath = env.AUVP_AUTH_LOGIN_LOCK_FILE?.trim();
  return customPath ? resolve(customPath) : join(getDefaultAuthDir(), "auth-login.lock");
}

export async function acquireAuthLoginLock(
  env: NodeJS.ProcessEnv = process.env,
  options: { waitMs?: number; staleMs?: number; pollMs?: number } = {},
): Promise<AuthLoginLock | undefined> {
  const path = getAuthLoginLockPath(env);
  const waitMs = options.waitMs ?? DEFAULT_WAIT_MS;
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const pollMs = options.pollMs ?? 1_000;
  const deadline = Date.now() + waitMs;
  const owner = `${process.pid}:${randomUUID()}`;
  mkdirSync(join(path, ".."), { recursive: true });
  let forceAttempt = true;

  while (forceAttempt || Date.now() <= deadline) {
    forceAttempt = false;
    try {
      const fd = openSync(path, "wx", 0o600);
      writeFileSync(fd, JSON.stringify({ owner, pid: process.pid, createdAt: Date.now() }), "utf8");
      closeSync(fd);
      return { path, owner, release: () => releaseOwnedLock(path, owner) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      if (isStaleLock(path, staleMs)) {
        try {
          unlinkSync(path);
        } catch {
          // Another process may have replaced the stale lock first.
        }
        forceAttempt = true;
        continue;
      }
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, pollMs));
  }
  return undefined;
}

function isStaleLock(path: string, staleMs: number): boolean {
  if (!existsSync(path)) return true;
  try {
    const lock = JSON.parse(readFileSync(path, "utf8")) as { pid?: unknown; createdAt?: unknown };
    if (typeof lock.createdAt !== "number" || Date.now() - lock.createdAt > staleMs) return true;
    return typeof lock.pid === "number" ? !isProcessAlive(lock.pid) : true;
  } catch {
    return true;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function releaseOwnedLock(path: string, owner: string): void {
  try {
    const lock = JSON.parse(readFileSync(path, "utf8")) as { owner?: unknown };
    if (lock.owner === owner) unlinkSync(path);
  } catch {
    // The lock may already have been removed.
  }
}
