import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadPersistedAnaliticaCookieHeader } from "./analitica/cookies.js";
import { loadPersistedComunidadeCookieHeader } from "./comunidade/cookies.js";
import { loadPersistedBearerToken } from "./auth/storage.js";
import { bootstrapAuthOnStartup } from "./auth/ensure-auth.js";
import { AuvpFinancasClient } from "./core/http-client.js";
import { MCP_GITHUB_REPOSITORY } from "./core/project.js";
import { callAuvpTool, listAuvpTools } from "./mcp/registry.js";

export function createAuvpFinancasClient(): AuvpFinancasClient {
  const client = new AuvpFinancasClient();
  const token = loadPersistedBearerToken();

  if (token) {
    client.setBearerToken(token);
  }

  const analiticaCookie = loadPersistedAnaliticaCookieHeader();
  if (analiticaCookie) {
    client.setAnaliticaCookieHeader(analiticaCookie);
  }

  const comunidadeCookie = loadPersistedComunidadeCookieHeader();
  if (comunidadeCookie) {
    client.setComunidadeCookieHeader(comunidadeCookie);
  }

  return client;
}

export function createServer(client = createAuvpFinancasClient()): Server {
  const server = new Server(
    {
      name: "mcp-auvp-financas",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: `MCP AUVP — Finanças, Analítica e Comunidade. Repositório: ${MCP_GITHUB_REPOSITORY}. Auth: auvp_ensure_auth.`,
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listAuvpTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    callAuvpTool(
      client,
      request.params.name,
      request.params.arguments ?? {},
    ),
  );

  return server;
}

export async function runStdioServer(): Promise<void> {
  const client = createAuvpFinancasClient();
  const transport = new StdioServerTransport();
  const server = createServer(client);
  await server.connect(transport);

  void bootstrapAuthOnStartup(client).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[auvp-financas] Falha ao autenticar na inicialização: ${message}`,
    );
  });
}
