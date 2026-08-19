import {
  completeSsoLoginInputSchema,
  createSsoLoginUrlInputSchema,
  ensureAuthInputSchema,
  emptyInputSchema,
} from "../mcp/schemas/json.js";
import {
  completeSsoLoginSchema,
  createSsoLoginUrlSchema,
  emptyArgsSchema,
  ensureAuthSchema,
} from "../mcp/schemas/zod.js";
import { persistBearerToken } from "./storage.js";
import { ensureAuth } from "./ensure-auth.js";
import {
  completeSsoLogin as completeSsoLoginFlow,
  createSsoLoginUrl,
} from "./sso.js";
import { getMcpProjectInfo } from "../core/project.js";
import {
  defineTool,
  jsonResult,
  type ToolDefinition,
} from "../mcp/tool-utils.js";
import { ALL_AUVP_MODULES, type AuvpModule } from "../mcp/modules.js";

export function createAuthToolDefinitions(
  enabledModules: readonly AuvpModule[] = ALL_AUVP_MODULES,
): ToolDefinition[] {
  return [
  defineTool(
    "auvp_create_sso_login_url",
    "Create the AUVP SSO login URL via /auth/redirect-url so the API issues a valid OIDC state for this MCP session.",
    createSsoLoginUrlInputSchema,
    async (client, args) => {
      const parsed = createSsoLoginUrlSchema.parse(args ?? {});
      return jsonResult(await createSsoLoginUrl(client, parsed));
    },
  ),
  defineTool(
    "auvp_complete_sso_login",
    "Complete AUVP SSO login with the callback URL or authorization code, capturing cookies or bearer token and persisting the bearer token to disk when available.",
    completeSsoLoginInputSchema,
    async (client, args) => {
      const parsed = completeSsoLoginSchema.parse(args ?? {});
      const result = await completeSsoLoginFlow(client, parsed);
      const authStatus = client.getAuthStatus();
      let tokenFile: string | undefined;

      if (authStatus.hasBearerToken) {
        const token = client.getBearerToken();
        if (token) {
          tokenFile = persistBearerToken(token);
        }
      }

      return jsonResult({
        ...result,
        tokenPersisted: Boolean(tokenFile),
        tokenFile,
      });
    },
  ),
  defineTool(
    "auvp_ensure_auth",
    "Ensure AUVP authentication is valid. Reuses the saved token when possible, tries a silent browser refresh with the persistent profile, and opens a visible browser only when login is still required.",
    ensureAuthInputSchema,
    async (client, args) => {
      const parsed = ensureAuthSchema.parse(args ?? {});
      return jsonResult(
        await ensureAuth(client, {
          fresh: parsed.fresh,
          forceBrowser: parsed.forceBrowser,
          interactive: parsed.interactive ?? true,
          modules: enabledModules,
        }),
      );
    },
  ),
  defineTool(
    "auvp_get_auth_status",
    "Show AUVP auth status (bearer, cookies, session) without revealing secrets, plus MCP project metadata (GitHub repository and npx install spec).",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult({
        ...client.getAuthStatus(),
        project: getMcpProjectInfo(),
      });
    },
  ),
  ];
}

export const authToolDefinitions: ToolDefinition[] =
  createAuthToolDefinitions();
