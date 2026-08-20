import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AuvpFinancasClient } from "../src/core/http-client.js";
import { syncCarteiraTokenFromDisk } from "../src/carteira/auth.js";
import { scanCarteiraTools } from "../src/carteira/scan-tools.js";

const client = new AuvpFinancasClient();
syncCarteiraTokenFromDisk(client);
if (!client.getCarteiraToken()) throw new Error("Token da Carteira ausente. Execute auvp_ensure_auth.");
const report = await scanCarteiraTools(client);
const outputPath = resolve("data/carteira-tools-report.json");
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Relatório salvo em ${outputPath}`);
console.log(`Resumo: ${report.summary.ok} ok, ${report.summary.error} erros`);
process.exit(report.summary.error > 0 ? 1 : 0);

