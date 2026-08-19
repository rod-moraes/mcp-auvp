import type { AuvpFinancasClient } from "../core/http-client.js";
import { sanitizeReportError } from "../core/report-sanitizer.js";
import { callAuvpTool } from "../mcp/registry.js";

export async function scanDicionarioTools(client: AuvpFinancasClient) {
  const probes: Array<[string, Record<string, unknown>]> = [
    ["auvp_dicionario_list_observed_routes", {}],
    ["auvp_dicionario_search_terms", { page: 1, query: "", category: "", letter: "", author: false }],
  ];
  const results = [];
  let sampleTermId: string | undefined;
  for (const [tool, args] of probes) {
    const startedAt = Date.now();
    const response = await callAuvpTool(client, tool, args, ["dicionario"]);
    const text = response.content[0]?.type === "text" ? response.content[0].text : undefined;
    if (tool === "auvp_dicionario_search_terms" && text && !response.isError) {
      try {
        const parsed = JSON.parse(text) as { terms?: Array<{ id?: unknown }> };
        const id = parsed.terms?.[0]?.id;
        if (typeof id === "string") sampleTermId = id;
      } catch {
        // The scan records the search result status below.
      }
    }
    results.push({
      tool,
      ok: !response.isError,
      isError: Boolean(response.isError),
      error: response.isError ? sanitizeReportError(text) : undefined,
      durationMs: Date.now() - startedAt,
    });
  }
  if (sampleTermId) {
    const startedAt = Date.now();
    const response = await callAuvpTool(
      client,
      "auvp_dicionario_get_term",
      { termId: sampleTermId },
      ["dicionario"],
    );
    const text = response.content[0]?.type === "text" ? response.content[0].text : undefined;
    results.push({
      tool: "auvp_dicionario_get_term",
      ok: !response.isError,
      isError: Boolean(response.isError),
      error: response.isError ? sanitizeReportError(text) : undefined,
      durationMs: Date.now() - startedAt,
    });
  }
  return {
    scannedAt: new Date().toISOString(),
    writeProbesExecuted: false,
    results,
    summary: {
      total: results.length,
      ok: results.filter((entry) => entry.ok).length,
      error: results.filter((entry) => entry.isError).length,
    },
  };
}
