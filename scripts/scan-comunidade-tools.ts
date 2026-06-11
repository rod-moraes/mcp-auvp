import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { syncComunidadeCookieFromDisk } from "../src/comunidade/cookies.js";
import { scanComunidadeTools } from "../src/comunidade/scan-tools.js";
import { AuvpFinancasClient } from "../src/core/http-client.js";

async function main(): Promise<void> {
  const client = new AuvpFinancasClient();
  syncComunidadeCookieFromDisk(client);

  if (!client.getComunidadeCookieHeader()) {
    console.error(
      "Cookie da Comunidade ausente. Execute auvp_ensure_auth ou configure AUVP_COMUNIDADE_COOKIE_FILE.",
    );
    process.exit(1);
  }

  const report = await scanComunidadeTools(client);
  const outputPath = resolve("data/comunidade-tools-report.json");
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Relatório salvo em ${outputPath}`);
  console.log(
    `Resumo: ${report.summary.ok} ok, ${report.summary.error} erro, ${report.summary.skipped} ignorados (total ${report.summary.total})`,
  );

  const failures = report.results.filter(
    (result) => result.isError && !result.skipped,
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
