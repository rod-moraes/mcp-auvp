import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AuvpFinancasClient } from "../src/core/http-client.js";
import { scanFinancasTools } from "../src/financas/scan-tools.js";
import { syncBearerTokenFromDisk } from "../src/auth/storage.js";

async function main(): Promise<void> {
  const client = new AuvpFinancasClient();
  syncBearerTokenFromDisk(client);

  if (!client.getBearerToken()) {
    console.error(
      "Token ausente. Execute auvp_ensure_auth ou configure AUVP_FINANCAS_ACCESS_TOKEN_FILE.",
    );
    process.exit(1);
  }

  const report = await scanFinancasTools(client);
  const outputPath = resolve("data/financas-tools-report.json");
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Relatório salvo em ${outputPath}`);
  console.log(
    `Resumo: ${report.summary.ok} ok, ${report.summary.error} erro inesperado, ${report.summary.expectedError} erro esperado, ${report.summary.skipped} ignorados (total ${report.summary.total})`,
  );

  const failures = report.results.filter(
    (result) => result.isError && !result.skipped && !result.expectedFailure,
  );
  if (failures.length > 0) {
    console.log("\nFalhas:");
    for (const failure of failures) {
      console.log(`- ${failure.tool}: ${failure.error ?? "erro desconhecido"}`);
    }
  }

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
