import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acquireAuthLoginLock } from "../src/auth/login-lock.js";

describe("auth login lock", () => {
  it("allows only one owner and releases for the next process", async () => {
    const dir = mkdtempSync(join(tmpdir(), "auvp-lock-"));
    const path = join(dir, "login.lock");
    const env = { AUVP_AUTH_LOGIN_LOCK_FILE: path };
    try {
      const first = await acquireAuthLoginLock(env, { waitMs: 0, pollMs: 1 });
      expect(first).toBeDefined();
      const second = await acquireAuthLoginLock(env, { waitMs: 0, pollMs: 1 });
      expect(second).toBeUndefined();
      first?.release();
      const third = await acquireAuthLoginLock(env, { waitMs: 0, pollMs: 1 });
      expect(third).toBeDefined();
      third?.release();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("recovers a stale lock", async () => {
    const dir = mkdtempSync(join(tmpdir(), "auvp-lock-"));
    const path = join(dir, "login.lock");
    writeFileSync(path, JSON.stringify({ owner: "old", pid: 999999, createdAt: 0 }));
    try {
      const lock = await acquireAuthLoginLock(
        { AUVP_AUTH_LOGIN_LOCK_FILE: path },
        { waitMs: 0, staleMs: 1, pollMs: 1 },
      );
      expect(lock).toBeDefined();
      lock?.release();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

