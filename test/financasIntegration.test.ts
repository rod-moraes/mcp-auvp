import { describe, expect, it } from "vitest";
import { AuvpFinancasClient } from "../src/core/http-client.js";
import { scanFinancasTools } from "../src/financas/scan-tools.js";
import { syncBearerTokenFromDisk } from "../src/auth/storage.js";

const runIntegration = process.env.FINANCAS_INTEGRATION === "1";

describe.runIf(runIntegration)("finanças integration", () => {
  it("executa varredura das tools com token real", async () => {
    const client = new AuvpFinancasClient();
    syncBearerTokenFromDisk(client);

    expect(client.getBearerToken()).toBeTruthy();

    const report = await scanFinancasTools(client);

    expect(report.results.length).toBeGreaterThan(20);
    expect(report.summary.total).toBe(report.results.length);
    expect(report.summary.ok).toBeGreaterThan(0);
  }, 120_000);
});

describe.skipIf(runIntegration)("finanças integration", () => {
  it("fica desabilitado sem FINANCAS_INTEGRATION=1", () => {
    expect(runIntegration).toBe(false);
  });
});
