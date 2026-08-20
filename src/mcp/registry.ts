import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { syncAnaliticaCookieFromDisk } from "../analitica/cookies.js";
import { createAuthToolDefinitions } from "../auth/tools.js";
import { syncComunidadeCookieFromDisk } from "../comunidade/cookies.js";
import { comunidadeToolDefinitions } from "../comunidade/tools.js";
import type { AuvpFinancasClient } from "../core/http-client.js";
import { AuvpApiError } from "../core/errors.js";
import { analiticaToolDefinitions } from "../analitica/tools.js";
import { financasToolDefinitions } from "../financas/tools.js";
import { carteiraToolDefinitions } from "../carteira/tools.js";
import { dicionarioToolDefinitions } from "../dicionario/tools.js";
import { syncCarteiraTokenFromDisk } from "../carteira/auth.js";
import { syncBearerTokenFromDisk } from "../auth/storage.js";
import { trySilentAuthRefresh } from "../auth/ensure-auth.js";
import {
  errorResult,
  formatToolError,
  type ToolDefinition,
  type ToolResult,
} from "./tool-utils.js";
import {
  ALL_AUVP_MODULES,
  type AuvpModule,
} from "./modules.js";

const toolDefinitionsByModule: Record<AuvpModule, ToolDefinition[]> = {
  financas: financasToolDefinitions,
  analitica: analiticaToolDefinitions,
  comunidade: comunidadeToolDefinitions,
  carteira: carteiraToolDefinitions,
  dicionario: dicionarioToolDefinitions,
};

function getToolDefinitions(
  enabledModules: readonly AuvpModule[],
): ToolDefinition[] {
  return [
    ...createAuthToolDefinitions(enabledModules),
    ...enabledModules.flatMap((moduleName) => toolDefinitionsByModule[moduleName]),
  ];
}

const AUTH_TOOLS_WITHOUT_AUTO_REFRESH = new Set([
  "auvp_create_sso_login_url",
  "auvp_complete_sso_login",
  "auvp_ensure_auth",
  "auvp_get_auth_status",
]);

export function listAuvpTools(
  enabledModules: readonly AuvpModule[] = ALL_AUVP_MODULES,
): Tool[] {
  return getToolDefinitions(enabledModules).map(
    ({ handler: _handler, ...definition }) => definition,
  );
}

export async function callAuvpTool(
  client: AuvpFinancasClient,
  name: string,
  args: unknown,
  enabledModules: readonly AuvpModule[] = ALL_AUVP_MODULES,
): Promise<ToolResult> {
  const handlersByName = new Map(
    getToolDefinitions(enabledModules).map((definition) => [
      definition.name,
      definition.handler,
    ]),
  );
  const handler = handlersByName.get(name);

  if (!handler) {
    return errorResult(`Unknown tool: ${name}`);
  }

  syncBearerTokenFromDisk(client);
  syncAnaliticaCookieFromDisk(client);
  syncComunidadeCookieFromDisk(client);
  syncCarteiraTokenFromDisk(client);

  try {
    return await handler(client, args ?? {});
  } catch (error) {
    if (
      shouldAttemptSilentAuthRefresh(name, error) &&
      (await trySilentAuthRefresh(client, modulesForTool(name, enabledModules)))
    ) {
      try {
        return await handler(client, args ?? {});
      } catch (retryError) {
        return errorResult(formatToolError(retryError, name));
      }
    }

    return errorResult(formatToolError(error, name));
  }
}

function modulesForTool(
  name: string,
  enabledModules: readonly AuvpModule[],
): readonly AuvpModule[] {
  const moduleName = enabledModules.find((candidate) =>
    name.startsWith(`auvp_${candidate}_`),
  );
  return moduleName ? [moduleName] : enabledModules;
}

function shouldAttemptSilentAuthRefresh(
  name: string,
  error: unknown,
): boolean {
  return (
    !AUTH_TOOLS_WITHOUT_AUTO_REFRESH.has(name) &&
    error instanceof AuvpApiError &&
    error.status === 401
  );
}
