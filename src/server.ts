import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadPersistedAnaliticaCookieHeader } from "./analitica/cookies.js";
import { loadPersistedComunidadeCookieHeader } from "./comunidade/cookies.js";
import { loadPersistedBearerToken } from "./auth/storage.js";
import { loadPersistedCarteiraToken } from "./carteira/auth.js";
import { bootstrapAuthOnStartup } from "./auth/ensure-auth.js";
import { AuvpFinancasClient } from "./core/http-client.js";
import { MCP_GITHUB_REPOSITORY } from "./core/project.js";
import { callAuvpTool, listAuvpTools } from "./mcp/registry.js";
import {
  ALL_AUVP_MODULES,
  type AuvpModule,
} from "./mcp/modules.js";

export interface AuvpServerOptions {
  enabledModules?: readonly AuvpModule[];
}

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

  const carteiraToken = loadPersistedCarteiraToken();
  if (carteiraToken) {
    client.setCarteiraToken(carteiraToken);
  }

  return client;
}

export function createServer(
  client = createAuvpFinancasClient(),
  options: AuvpServerOptions = {},
): Server {
  const enabledModules = options.enabledModules ?? ALL_AUVP_MODULES;
  const server = new Server(
    {
      name: "mcp-auvp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: `MCP AUVP — módulos ativos: ${enabledModules.join(", ")}. Repositório: ${MCP_GITHUB_REPOSITORY}. Auth: auvp_ensure_auth.`,
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listAuvpTools(enabledModules),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    callAuvpTool(
      client,
      request.params.name,
      request.params.arguments ?? {},
      enabledModules,
    ),
  );

  return server;
}

export async function runStdioServer(
  options: AuvpServerOptions = {},
): Promise<void> {
  const enabledModules = options.enabledModules ?? ALL_AUVP_MODULES;
  const client = createAuvpFinancasClient();
  const transport = new StdioServerTransport();
  const server = createServer(client, { enabledModules });
  await server.connect(transport);

  void bootstrapAuthOnStartup(client, process.env, enabledModules).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[mcp-auvp] Falha ao autenticar na inicialização: ${message}`,
    );
  });
}
