import type { AuvpFinancasClient } from "../core/http-client.js";
import { sanitizeReportError } from "../core/report-sanitizer.js";
import { callAuvpTool } from "../mcp/registry.js";

const READ_ONLY_PROBES = [
  ["auvp_carteira_list_observed_routes", {}],
  ["auvp_carteira_get_portfolio", {}],
  ["auvp_carteira_list_assets", {}],
  ["auvp_carteira_get_investment_goals", {}],
  ["auvp_carteira_list_questions", {}],
  ["auvp_carteira_get_classification", {}],
  ["auvp_carteira_get_config", {}],
  ["auvp_carteira_search_asset_suggestions", { type: "acoes_nacionais", search: "PETR" }],
  ["auvp_carteira_search_country_ratings", { query: "Brasil", limit: 5 }],
] as const;

export async function scanCarteiraTools(client: AuvpFinancasClient) {
  const results = [];
  for (const [tool, args] of READ_ONLY_PROBES) {
    const startedAt = Date.now();
    const response = await callAuvpTool(client, tool, args, ["carteira"]);
    const text = response.content[0]?.type === "text" ? response.content[0].text : undefined;
    results.push({
      tool,
      ok: !response.isError,
      isError: Boolean(response.isError),
      error: response.isError ? sanitizeReportError(text) : undefined,
      durationMs: Date.now() - startedAt,
    });
  }
  return {
    scannedAt: new Date().toISOString(),
    hasCarteiraToken: Boolean(client.getCarteiraToken()),
    writeProbesExecuted: false,
    results,
    summary: {
      total: results.length,
      ok: results.filter((entry) => entry.ok).length,
      error: results.filter((entry) => entry.isError).length,
    },
  };
}
