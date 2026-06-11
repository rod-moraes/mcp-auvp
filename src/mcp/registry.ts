import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { syncAnaliticaCookieFromDisk } from "../analitica/cookies.js";
import { authToolDefinitions } from "../auth/tools.js";
import { syncComunidadeCookieFromDisk } from "../comunidade/cookies.js";
import { comunidadeToolDefinitions } from "../comunidade/tools.js";
import type { AuvpFinancasClient } from "../core/http-client.js";
import { AuvpApiError } from "../core/errors.js";
import { analiticaToolDefinitions } from "../analitica/tools.js";
import { financasToolDefinitions } from "../financas/tools.js";
import { syncBearerTokenFromDisk } from "../auth/storage.js";
import { trySilentAuthRefresh } from "../auth/ensure-auth.js";
import {
  errorResult,
  formatToolError,
  type ToolDefinition,
  type ToolResult,
} from "./tool-utils.js";

const toolDefinitions: ToolDefinition[] = [
  ...authToolDefinitions,
  ...financasToolDefinitions,
  ...analiticaToolDefinitions,
  ...comunidadeToolDefinitions,
];

const handlersByName = new Map(
  toolDefinitions.map((definition) => [definition.name, definition.handler]),
);

const AUTH_TOOLS_WITHOUT_AUTO_REFRESH = new Set([
  "auvp_create_sso_login_url",
  "auvp_complete_sso_login",
  "auvp_ensure_auth",
  "auvp_get_auth_status",
]);

export function listAuvpTools(): Tool[] {
  return toolDefinitions.map(
    ({ handler: _handler, ...definition }) => definition,
  );
}

export async function callAuvpTool(
  client: AuvpFinancasClient,
  name: string,
  args: unknown,
): Promise<ToolResult> {
  const handler = handlersByName.get(name);

  if (!handler) {
    return errorResult(`Unknown tool: ${name}`);
  }

  syncBearerTokenFromDisk(client);
  syncAnaliticaCookieFromDisk(client);
  syncComunidadeCookieFromDisk(client);

  try {
    return await handler(client, args ?? {});
  } catch (error) {
    if (
      shouldAttemptSilentAuthRefresh(name, error) &&
      (await trySilentAuthRefresh(client))
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
