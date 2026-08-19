import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AuvpFinancasClient } from "../src/core/http-client.js";
import { scanDicionarioTools } from "../src/dicionario/scan-tools.js";

const report = await scanDicionarioTools(new AuvpFinancasClient());
const outputPath = resolve("data/dicionario-tools-report.json");
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Relatório salvo em ${outputPath}`);
console.log(`Resumo: ${report.summary.ok} ok, ${report.summary.error} erros`);
process.exit(report.summary.error > 0 ? 1 : 0);

