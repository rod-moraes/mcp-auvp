import {
  getAnaliticaCookieFilePath,
  loadPersistedAnaliticaCookieHeader,
  syncAnaliticaCookieFromDisk,
} from "../analitica/cookies.js";
import {
  getComunidadeCookieFilePath,
  loadPersistedComunidadeCookieHeader,
  syncComunidadeCookieFromDisk,
} from "../comunidade/cookies.js";
import {
  getCarteiraTokenFilePath,
  loadPersistedCarteiraToken,
  syncCarteiraTokenFromDisk,
} from "../carteira/auth.js";
import { AuvpApiError } from "../core/errors.js";
import type { AuvpFinancasClient } from "../core/http-client.js";
import { ALL_AUVP_MODULES, type AuvpModule } from "../mcp/modules.js";
import { runBrowserLogin } from "./browser-login.js";
import { acquireAuthLoginLock } from "./login-lock.js";
import {
  getTokenFilePath,
  isBearerTokenExpired,
  loadPersistedBearerToken,
} from "./storage.js";

export interface EnsureAuthOptions {
  fresh?: boolean;
  forceBrowser?: boolean;
  interactive?: boolean;
  skipSilent?: boolean;
  modules?: readonly AuvpModule[];
}

export interface EnsureAuthResult {
  status: "authenticated" | "login_required" | "failed";
  method: "existing_token" | "silent_browser" | "interactive_browser" | "none";
  tokenPersisted: boolean;
  tokenFile?: string;
  profileDir?: string;
  analiticaCookieCaptured?: boolean;
  analiticaCookieFile?: string;
  comunidadeCookieCaptured?: boolean;
  comunidadeCookieFile?: string;
  carteiraTokenCaptured?: boolean;
  carteiraTokenFile?: string;
  authStatus: ReturnType<AuvpFinancasClient["getAuthStatus"]>;
  message?: string;
}

export function applyPersistedAuthToClient(client: AuvpFinancasClient): void {
  syncAnaliticaCookieFromDisk(client);
  syncComunidadeCookieFromDisk(client);
  syncCarteiraTokenFromDisk(client);
  const token = loadPersistedBearerToken();
  if (token) client.setBearerToken(token);
}

export function hasRequiredAuthMaterial(
  client: AuvpFinancasClient,
  modules: readonly AuvpModule[],
): boolean {
  const status = client.getAuthStatus();
  const token = loadPersistedBearerToken();
  return modules.every((moduleName) => {
    if (moduleName === "financas") {
      return status.hasBearerToken && (!token || isBearerTokenExpired(token) !== true);
    }
    if (moduleName === "analitica") return status.hasAnaliticaCookie;
    if (moduleName === "comunidade") return status.hasComunidadeCookie;
    if (moduleName === "carteira") return status.hasCarteiraToken;
    return true;
  });
}

export async function validateSelectedAuthentication(
  client: AuvpFinancasClient,
  modules: readonly AuvpModule[],
): Promise<boolean> {
  if (!hasRequiredAuthMaterial(client, modules)) return false;

  for (const moduleName of modules) {
    try {
      if (moduleName === "financas") await client.get("/users/profile");
      else if (moduleName === "analitica") await client.getAnalitica("/api/session");
      else if (moduleName === "comunidade") await client.getComunidadeText("/");
      else if (moduleName === "carteira") await client.getCarteira("/auth/me");
    } catch (error) {
      if (error instanceof AuvpApiError && [401, 403].includes(error.status ?? 0)) {
        return false;
      }
      throw error;
    }
  }
  return true;
}

export async function ensureAuth(
  client: AuvpFinancasClient,
  options: EnsureAuthOptions = {},
): Promise<EnsureAuthResult> {
  const fresh = options.fresh ?? false;
  const forceBrowser = options.forceBrowser ?? false;
  const interactive = options.interactive ?? true;
  const skipSilent = options.skipSilent ?? false;
  const modules = options.modules ?? ALL_AUVP_MODULES;
  applyPersistedAuthToClient(client);

  if (!forceBrowser && !fresh && (await validateSelectedAuthentication(client, modules))) {
    return buildResult(client, "authenticated", "existing_token",
      "As credenciais salvas dos módulos selecionados continuam válidas.");
  }

  if (!fresh && !skipSilent) {
    const silentResult = await runBrowserLogin({ headless: true, waitTimeoutMs: 25_000, modules });
    if (silentResult) {
      applyPersistedAuthToClient(client);
      if (await validateSelectedAuthentication(client, modules)) {
        return buildResult(client, "authenticated", "silent_browser",
          "Sessão renovada silenciosamente com o perfil salvo.", silentResult.profileDir);
      }
    }
  }

  if (!interactive) {
    return buildResult(client, "login_required", "none",
      "Autenticação necessária. Chame auvp_ensure_auth com interactive=true.");
  }

  const lock = await acquireAuthLoginLock();
  if (!lock) {
    applyPersistedAuthToClient(client);
    if (await validateSelectedAuthentication(client, modules)) {
      return buildResult(client, "authenticated", "existing_token",
        "Outra instância concluiu o login e as credenciais foram reutilizadas.");
    }
    return buildResult(client, "login_required", "none",
      "Outra instância está realizando o login. Tente novamente quando ela concluir.");
  }

  try {
    applyPersistedAuthToClient(client);
    if (!forceBrowser && !fresh && (await validateSelectedAuthentication(client, modules))) {
      return buildResult(client, "authenticated", "existing_token",
        "Outra instância já atualizou as credenciais salvas.");
    }

    const interactiveResult = await runBrowserLogin({
      fresh,
      headless: false,
      waitTimeoutMs: 10 * 60_000,
      modules,
    });
    if (!interactiveResult) {
      return buildResult(client, "login_required", "interactive_browser",
        "Login ainda pendente na janela aberta. Conclua o SSO e chame auvp_ensure_auth novamente.");
    }

    applyPersistedAuthToClient(client);
    if (!(await validateSelectedAuthentication(client, modules))) {
      return buildResult(client, "failed", "interactive_browser",
        "As credenciais foram capturadas, mas algum módulo selecionado ainda recusou a sessão. Tente fresh=true.",
        interactiveResult.profileDir);
    }

    return buildResult(client, "authenticated", "interactive_browser",
      "Login concluído e credenciais dos módulos selecionados salvas.", interactiveResult.profileDir);
  } finally {
    lock.release();
  }
}

function buildResult(
  client: AuvpFinancasClient,
  status: EnsureAuthResult["status"],
  method: EnsureAuthResult["method"],
  message: string,
  profileDir?: string,
): EnsureAuthResult {
  return {
    status,
    method,
    message,
    profileDir,
    tokenPersisted: Boolean(loadPersistedBearerToken()),
    tokenFile: getTokenFilePath(),
    analiticaCookieCaptured: Boolean(loadPersistedAnaliticaCookieHeader()),
    analiticaCookieFile: getAnaliticaCookieFilePath(),
    comunidadeCookieCaptured: Boolean(loadPersistedComunidadeCookieHeader()),
    comunidadeCookieFile: getComunidadeCookieFilePath(),
    carteiraTokenCaptured: Boolean(loadPersistedCarteiraToken()),
    carteiraTokenFile: getCarteiraTokenFilePath(),
    authStatus: client.getAuthStatus(),
  };
}

export function shouldAutoLoginOnStart(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.AUVP_FINANCAS_AUTO_LOGIN_ON_START?.trim().toLowerCase();
  return !value || !["0", "false", "no"].includes(value);
}

export function shouldForceLoginOnStart(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.AUVP_FINANCAS_FORCE_LOGIN_ON_START?.trim().toLowerCase();
  return Boolean(value && !["0", "false", "no"].includes(value));
}

export function getBootstrapAuthOptions(
  env: NodeJS.ProcessEnv = process.env,
  modules: readonly AuvpModule[] = ALL_AUVP_MODULES,
): EnsureAuthOptions {
  return { interactive: true, skipSilent: false, forceBrowser: shouldForceLoginOnStart(env), modules };
}

export async function bootstrapAuthOnStartup(
  client: AuvpFinancasClient,
  env: NodeJS.ProcessEnv = process.env,
  modules: readonly AuvpModule[] = ALL_AUVP_MODULES,
): Promise<EnsureAuthResult | undefined> {
  if (!shouldAutoLoginOnStart(env)) return undefined;
  console.error("[mcp-auvp] Verificando autenticação salva na inicialização…");
  const authResult = await ensureAuth(client, getBootstrapAuthOptions(env, modules));
  console.error(`[mcp-auvp] Auth ${authResult.status} (${authResult.method}): ${authResult.message ?? ""}`);
  return authResult;
}

export async function trySilentAuthRefresh(
  client: AuvpFinancasClient,
  modules: readonly AuvpModule[] = ALL_AUVP_MODULES,
): Promise<boolean> {
  const silentResult = await runBrowserLogin({ headless: true, waitTimeoutMs: 25_000, modules });
  if (!silentResult) return false;
  applyPersistedAuthToClient(client);
  return validateSelectedAuthentication(client, modules);
}
