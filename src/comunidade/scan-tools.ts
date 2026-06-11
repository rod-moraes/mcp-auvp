import type { AuvpFinancasClient } from "../core/http-client.js";
import { callAuvpTool } from "../mcp/registry.js";
import type { ToolResult } from "../mcp/tool-utils.js";
import { comunidadeToolDefinitions } from "./tools.js";

const SAMPLE_TOPIC_URL =
  "https://comunidade.auvp.com.br/topic/43093-empreender-agora-ou-esperar/";

export interface ComunidadeToolScanResult {
  tool: string;
  ok: boolean;
  isError: boolean;
  error?: string;
  durationMs: number;
  skipped?: boolean;
  skipReason?: string;
}

export interface ComunidadeScanReport {
  scannedAt: string;
  hasComunidadeCookie: boolean;
  results: ComunidadeToolScanResult[];
  summary: {
    total: number;
    ok: number;
    error: number;
    skipped: number;
  };
}

interface ScanProbe {
  tool: string;
  args: Record<string, unknown>;
  skip?: string;
}

function parseToolPayload(result: ToolResult): unknown | undefined {
  const first = result.content[0];
  if (first?.type !== "text") {
    return undefined;
  }

  try {
    return JSON.parse(first.text) as unknown;
  } catch {
    return first.text;
  }
}

async function runProbe(
  client: AuvpFinancasClient,
  probe: ScanProbe,
): Promise<ComunidadeToolScanResult> {
  const started = Date.now();

  if (probe.skip) {
    return {
      tool: probe.tool,
      ok: false,
      isError: false,
      skipped: true,
      skipReason: probe.skip,
      durationMs: Date.now() - started,
    };
  }

  try {
    const result = await callAuvpTool(client, probe.tool, probe.args);
    const payload = parseToolPayload(result);
    const isError = Boolean(result.isError);

    return {
      tool: probe.tool,
      ok: !isError,
      isError,
      error: isError ? JSON.stringify(payload) : undefined,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      tool: probe.tool,
      ok: false,
      isError: true,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

function buildProbes(): ScanProbe[] {
  return [
    { tool: "auvp_comunidade_list_observed_routes", args: {} },
    { tool: "auvp_comunidade_list_forums", args: {} },
    {
      tool: "auvp_comunidade_search",
      args: {
        query: "tesouro",
        contentType: "forums_topic",
        sortBy: "relevancy",
        page: 1,
      },
    },
    {
      tool: "auvp_comunidade_search",
      args: {
        query: "tesouro",
        contentType: "forums_topic",
        sortBy: "relevancy",
        page: 2,
      },
    },
    {
      tool: "auvp_comunidade_list_forum_topics",
      args: { forum: "devs-projetos", page: 1 },
    },
    {
      tool: "auvp_comunidade_get_topic",
      args: { url: SAMPLE_TOPIC_URL },
    },
    { tool: "auvp_comunidade_list_notifications", args: {} },
    {
      tool: "auvp_comunidade_get_top_contributors",
      args: { time: "week", limit: 5 },
    },
    {
      tool: "auvp_comunidade_get_most_solved",
      args: { time: "month", limit: 5 },
    },
  ];
}

export async function scanComunidadeTools(
  client: AuvpFinancasClient,
): Promise<ComunidadeScanReport> {
  const definedTools = new Set(comunidadeToolDefinitions.map((tool) => tool.name));
  const probes = buildProbes().filter((probe) => definedTools.has(probe.tool));

  const results: ComunidadeToolScanResult[] = [];
  for (const probe of probes) {
    results.push(await runProbe(client, probe));
  }

  return {
    scannedAt: new Date().toISOString(),
    hasComunidadeCookie: Boolean(client.getComunidadeCookieHeader()),
    results,
    summary: {
      total: results.length,
      ok: results.filter((result) => result.ok).length,
      error: results.filter((result) => result.isError && !result.skipped).length,
      skipped: results.filter((result) => result.skipped).length,
    },
  };
}
