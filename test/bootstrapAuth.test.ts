import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuvpFinancasClient } from "../src/core/http-client.js";
import * as ensureAuthModule from "../src/auth/ensure-auth.js";

describe("bootstrap auth on startup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is enabled by default", () => {
    expect(ensureAuthModule.shouldAutoLoginOnStart({})).toBe(true);
    expect(
      ensureAuthModule.shouldAutoLoginOnStart({
        AUVP_FINANCAS_AUTO_LOGIN_ON_START: "0",
      }),
    ).toBe(false);
  });

  it("skips ensureAuth when auto login is disabled", async () => {
    const client = {} as AuvpFinancasClient;

    const result = await ensureAuthModule.bootstrapAuthOnStartup(client, {
      AUVP_FINANCAS_AUTO_LOGIN_ON_START: "0",
    });

    expect(result).toBeUndefined();
  });

  it("forces browser login on every startup by default", () => {
    expect(ensureAuthModule.shouldForceLoginOnStart({})).toBe(true);
    expect(
      ensureAuthModule.shouldForceLoginOnStart({
        AUVP_FINANCAS_FORCE_LOGIN_ON_START: "0",
      }),
    ).toBe(false);
  });

  it("uses forceBrowser on startup by default", () => {
    expect(ensureAuthModule.getBootstrapAuthOptions({})).toEqual({
      interactive: true,
      skipSilent: true,
      forceBrowser: true,
    });
    expect(
      ensureAuthModule.getBootstrapAuthOptions({
        AUVP_FINANCAS_FORCE_LOGIN_ON_START: "0",
      }).forceBrowser,
    ).toBe(false);
  });
});
