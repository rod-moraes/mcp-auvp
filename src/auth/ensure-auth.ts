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
  getTokenFilePath,
  isBearerTokenExpired,
  loadPersistedBearerToken,
  persistBearerToken,
} from "./storage.js";
import {
  refreshSecondarySiteCookies,
  runBrowserLogin,
} from "./browser-login.js";
import { AuvpApiError } from "../core/errors.js";
import type { AuvpFinancasClient } from "../core/http-client.js";

export interface EnsureAuthOptions {
  fresh?: boolean;
  forceBrowser?: boolean;
  interactive?: boolean;
  skipSilent?: boolean;
}

export interface EnsureAuthResult {
  status: "authenticated" | "login_required" | "failed";
  method:
    | "existing_token"
    | "silent_browser"
    | "interactive_browser"
    | "none";
  tokenPersisted: boolean;
  tokenFile?: string;
  profileDir?: string;
  analiticaCookieCaptured?: boolean;
  analiticaCookieFile?: string;
  comunidadeCookieCaptured?: boolean;
  comunidadeCookieFile?: string;
  authStatus: ReturnType<AuvpFinancasClient["getAuthStatus"]>;
  message?: string;
}

function applyPersistedAuthToClient(client: AuvpFinancasClient): void {
  syncAnaliticaCookieFromDisk(client);
  syncComunidadeCookieFromDisk(client);
  const token = loadPersistedBearerToken();
  if (token) {
    client.setBearerToken(token);
  }
}

function hasFullAuthentication(client: AuvpFinancasClient): boolean {
  const authStatus = client.getAuthStatus();
  return (
    authStatus.hasBearerToken &&
    authStatus.hasAnaliticaCookie &&
    authStatus.hasComunidadeCookie
  );
}

function buildMissingAuthMessage(client: AuvpFinancasClient): string {
  const authStatus = client.getAuthStatus();
  const missing: string[] = [];

  if (!authStatus.hasBearerToken) {
    missing.push("Finanças");
  }
  if (!authStatus.hasAnaliticaCookie) {
    missing.push("Analítica");
  }
  if (!authStatus.hasComunidadeCookie) {
    missing.push("Comunidade");
  }

  return `Autenticação incompleta. Falta: ${missing.join(", ")}.`;
}

function buildFullAuthMessage(): string {
  return "Token do Finanças e cookies do Analítica e da Comunidade estão válidos.";
}

type AuthResultBase = Omit<EnsureAuthResult, "status" | "message" | "authStatus">;

function finalizeAuthResult(
  client: AuvpFinancasClient,
  base: AuthResultBase & {
    successMessage?: string;
    pendingMessage?: string;
    isInteractivePending?: boolean;
  },
): EnsureAuthResult {
  const authStatus = client.getAuthStatus();

  if (hasFullAuthentication(client)) {
    return withAnaliticaCookieMetadata({
      ...base,
      status: "authenticated",
      authStatus,
      message: base.successMessage ?? buildFullAuthMessage(),
    });
  }

  if (base.isInteractivePending) {
    return withAnaliticaCookieMetadata({
      ...base,
      status: "login_required",
      authStatus,
      message: base.pendingMessage ?? buildMissingAuthMessage(client),
    });
  }

  return withAnaliticaCookieMetadata({
    ...base,
    status: "failed",
    authStatus,
    message: buildMissingAuthMessage(client),
  });
}

function needsSecondarySiteCookies(
  client: AuvpFinancasClient,
): boolean {
  const authStatus = client.getAuthStatus();
  return !authStatus.hasAnaliticaCookie || !authStatus.hasComunidadeCookie;
}

interface SecondarySiteCookiesResult {
  status: "complete" | "interactive_pending" | "missing";
  openedInteractiveBrowser: boolean;
}

async function ensureSecondarySiteCookies(
  client: AuvpFinancasClient,
  options: { interactive?: boolean } = {},
): Promise<SecondarySiteCookiesResult> {
  if (!needsSecondarySiteCookies(client)) {
    return { status: "complete", openedInteractiveBrowser: false };
  }

  if (!options.interactive) {
    await refreshSecondarySiteCookies({ headless: true });
    applyPersistedAuthToClient(client);
    if (!needsSecondarySiteCookies(client)) {
      return { status: "complete", openedInteractiveBrowser: false };
    }

    return { status: "missing", openedInteractiveBrowser: false };
  }

  console.error(
    "[auvp-financas] Cookie do Analítica ou da Comunidade ausente — abrindo navegador visível…",
  );
  await refreshSecondarySiteCookies({ headless: false });
  applyPersistedAuthToClient(client);

  if (needsSecondarySiteCookies(client)) {
    return { status: "interactive_pending", openedInteractiveBrowser: true };
  }

  return { status: "complete", openedInteractiveBrowser: true };
}

function withAnaliticaCookieMetadata<T extends EnsureAuthResult>(result: T): T {
  return {
    ...result,
    analiticaCookieCaptured: Boolean(loadPersistedAnaliticaCookieHeader()),
    analiticaCookieFile: getAnaliticaCookieFilePath(),
    comunidadeCookieCaptured: Boolean(loadPersistedComunidadeCookieHeader()),
    comunidadeCookieFile: getComunidadeCookieFilePath(),
  };
}

async function validateTokenWithApi(
  client: AuvpFinancasClient,
): Promise<boolean> {
  try {
    await client.get("/users/profile");
    return true;
  } catch (error) {
    if (error instanceof AuvpApiError && error.status === 401) {
      return false;
    }
    throw error;
  }
}

function hasUsableToken(client: AuvpFinancasClient): boolean {
  const authStatus = client.getAuthStatus();
  if (!authStatus.hasBearerToken && !authStatus.hasSessionCookie) {
    return false;
  }

  const token = loadPersistedBearerToken();
  if (token) {
    const expired = isBearerTokenExpired(token);
    if (expired === true) {
      return false;
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

  if (!forceBrowser && !fresh && hasUsableToken(client)) {
    if (await validateTokenWithApi(client)) {
      const secondaryStatus = await ensureSecondarySiteCookies(client, {
        interactive,
      });

      return finalizeAuthResult(client, {
        method: secondaryStatus.openedInteractiveBrowser
          ? "interactive_browser"
          : "existing_token",
        tokenPersisted: Boolean(loadPersistedBearerToken()),
        tokenFile: getTokenFilePath(),
        isInteractivePending: secondaryStatus.status === "interactive_pending",
        pendingMessage:
          "Navegador aberto — conclua o login no Finanças, Analítica e Comunidade e chame auvp_ensure_auth novamente.",
      });
    }
  }

  if (!fresh && !skipSilent) {
    const silentResult = await runBrowserLogin({
      headless: true,
      waitTimeoutMs: 25_000,
    });

    if (silentResult) {
      applyPersistedAuthToClient(client);
      if (await validateTokenWithApi(client)) {
        return finalizeAuthResult(client, {
          method: "silent_browser",
          tokenPersisted: true,
          tokenFile: silentResult.tokenFile,
          profileDir: silentResult.profileDir,
          analiticaCookieCaptured: silentResult.analiticaCookieCaptured,
          analiticaCookieFile: silentResult.analiticaCookieFile,
          comunidadeCookieCaptured: silentResult.comunidadeCookieCaptured,
          comunidadeCookieFile: silentResult.comunidadeCookieFile,
          successMessage:
            "Token renovado automaticamente com a sessão salva do navegador.",
        });
      }
    }
  }

  if (!interactive) {
    return withAnaliticaCookieMetadata({
      status: "login_required",
      method: "none",
      tokenPersisted: false,
      authStatus: client.getAuthStatus(),
      message:
        "Autenticação necessária. Chame auvp_ensure_auth com interactive=true para abrir o navegador.",
    });
  }

  const interactiveResult = await runBrowserLogin({
    fresh,
    headless: false,
    waitTimeoutMs: 10 * 60_000,
  });

  if (!interactiveResult) {
    return withAnaliticaCookieMetadata({
      status: "login_required",
      method: "none",
      tokenPersisted: false,
      authStatus: client.getAuthStatus(),
      message:
        "Login ainda pendente. A janela do navegador foi mantida aberta — conclua o SSO e chame auvp_ensure_auth novamente.",
    });
  }

  applyPersistedAuthToClient(client);

  if (!(await validateTokenWithApi(client))) {
    return withAnaliticaCookieMetadata({
      status: "failed",
      method: "interactive_browser",
      tokenPersisted: true,
      tokenFile: interactiveResult.tokenFile,
      profileDir: interactiveResult.profileDir,
      analiticaCookieCaptured: interactiveResult.analiticaCookieCaptured,
      analiticaCookieFile: interactiveResult.analiticaCookieFile,
      comunidadeCookieCaptured: interactiveResult.comunidadeCookieCaptured,
      comunidadeCookieFile: interactiveResult.comunidadeCookieFile,
      authStatus: client.getAuthStatus(),
      message:
        "Token capturado, mas a API ainda respondeu 401. Tente auvp_ensure_auth com fresh=true.",
    });
  }

  return finalizeAuthResult(client, {
    method: "interactive_browser",
    tokenPersisted: true,
    tokenFile: interactiveResult.tokenFile,
    profileDir: interactiveResult.profileDir,
    analiticaCookieCaptured: interactiveResult.analiticaCookieCaptured,
    analiticaCookieFile: interactiveResult.analiticaCookieFile,
    comunidadeCookieCaptured: interactiveResult.comunidadeCookieCaptured,
    comunidadeCookieFile: interactiveResult.comunidadeCookieFile,
    successMessage:
      "Login concluído e token/cookies do Finanças, Analítica e Comunidade salvos em disco.",
  });
}

export function shouldAutoLoginOnStart(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const value = env.AUVP_FINANCAS_AUTO_LOGIN_ON_START?.trim().toLowerCase();
  if (!value) {
    return true;
  }

  return value !== "0" && value !== "false" && value !== "no";
}

export function shouldForceLoginOnStart(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const value = env.AUVP_FINANCAS_FORCE_LOGIN_ON_START?.trim().toLowerCase();
  if (!value) {
    return true;
  }

  return value !== "0" && value !== "false" && value !== "no";
}

export function getBootstrapAuthOptions(
  env: NodeJS.ProcessEnv = process.env,
): EnsureAuthOptions {
  return {
    interactive: true,
    skipSilent: true,
    forceBrowser: shouldForceLoginOnStart(env),
  };
}

export async function bootstrapAuthOnStartup(
  client: AuvpFinancasClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<EnsureAuthResult | undefined> {
  if (!shouldAutoLoginOnStart(env)) {
    return undefined;
  }

  const bootstrapOptions = getBootstrapAuthOptions(env);
  if (bootstrapOptions.forceBrowser) {
    console.error(
      "[auvp-financas] Inicialização do MCP — abrindo navegador para renovar login do Finanças, Analítica e Comunidade…",
    );
  } else {
    console.error(
      "[auvp-financas] Verificando autenticação na inicialização do MCP…",
    );
  }

  const result = await ensureAuth(client, bootstrapOptions);

  if (result.status === "authenticated") {
    console.error(
      `[auvp-financas] Autenticado (${result.method}): ${result.message}`,
    );
  } else if (result.status === "login_required") {
    console.error(
      `[auvp-financas] Login pendente (${result.method}): ${result.message ?? result.status}`,
    );
  } else if (result.status === "failed") {
    console.error(
      `[auvp-financas] Autenticação incompleta (${result.method}): ${result.message ?? result.status}`,
    );
  } else {
    console.error(`[auvp-financas] ${result.message ?? result.status}`);
  }

  return result;
}

export async function trySilentAuthRefresh(
  client: AuvpFinancasClient,
): Promise<boolean> {
  const silentResult = await runBrowserLogin({
    headless: true,
    waitTimeoutMs: 25_000,
  });

  if (!silentResult) {
    return false;
  }

  applyPersistedAuthToClient(client);
  if (!(await validateTokenWithApi(client))) {
    return false;
  }

  return hasFullAuthentication(client);
}
