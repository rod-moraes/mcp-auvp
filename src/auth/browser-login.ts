import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Browser, BrowserContext, Page } from "playwright";
import {
  ANALITICA_HOME_URL,
  buildCookieHeaderFromPlaywrightCookies,
  hasAnaliticaSessionCookie,
  getAnaliticaCookieFilePath,
  loadPersistedAnaliticaCookieHeader,
  persistAnaliticaCookieHeader,
} from "../analitica/cookies.js";
import {
  COMUNIDADE_HOME_URL,
  hasComunidadeSessionCookie,
  getComunidadeCookieFilePath,
  loadPersistedComunidadeCookieHeader,
  persistComunidadeCookieHeader,
} from "../comunidade/cookies.js";
import {
  getBrowserProfileDir,
  getDefaultAuthDir,
  getStorageStatePath,
  getTokenFilePath,
  persistBearerToken,
} from "./storage.js";
import { AuvpConfigError } from "../core/errors.js";
import {
  CARTEIRA_HOME_URL,
  CARTEIRA_LOCAL_STORAGE_KEY,
  getCarteiraTokenFilePath,
  persistCarteiraToken,
} from "../carteira/auth.js";
import { ALL_AUVP_MODULES, type AuvpModule } from "../mcp/modules.js";

const LOGIN_URL = "https://financas.auvp.com.br/sign-in";
const DASHBOARD_URL = "https://financas.auvp.com.br/";
const FINANCAS_ORIGIN = "https://financas.auvp.com.br";

export interface BrowserLoginOptions {
  fresh?: boolean;
  headless?: boolean;
  waitTimeoutMs?: number;
  modules?: readonly AuvpModule[];
}

export interface BrowserLoginResult {
  token: string;
  tokenFile: string;
  profileDir: string;
  method: "silent_browser" | "interactive_browser";
  analiticaCookieCaptured: boolean;
  analiticaCookieFile?: string;
  comunidadeCookieCaptured: boolean;
  comunidadeCookieFile?: string;
  carteiraTokenCaptured: boolean;
  carteiraTokenFile?: string;
}

let activeLogin: Promise<BrowserLoginResult | undefined> | null = null;
let openInteractiveContext: BrowserContext | null = null;

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new AuvpConfigError(
      "Playwright is required for browser login. Run `npm install` and `npm run playwright:install` in the MCP project.",
    );
  }
}

async function readAccessToken(
  context: BrowserContext,
): Promise<string | undefined> {
  const cookies = await context.cookies([FINANCAS_ORIGIN, DASHBOARD_URL]);
  return cookies.find((cookie) => cookie.name === "accessToken")?.value;
}

async function waitForAccessToken(
  context: BrowserContext,
  page: Page,
  timeoutMs: number,
): Promise<string | undefined> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const token = await readAccessToken(context);
    if (token) {
      return token;
    }

    await page.waitForTimeout(500);
  }

  return undefined;
}

async function getOrCreatePage(context: BrowserContext): Promise<Page> {
  for (const page of context.pages()) {
    if (!page.isClosed()) {
      return page;
    }
  }
  return context.newPage();
}

async function persistStorageState(context: BrowserContext): Promise<void> {
  const path = getStorageStatePath();
  mkdirSync(join(path, ".."), { recursive: true });
  await context.storageState({ path });
}

async function captureAnaliticaCookies(
  context: BrowserContext,
  page: Page,
  timeoutMs = 60_000,
): Promise<string | undefined> {
  console.error("[mcp-auvp] Coletando cookies do Analítica…");

  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) {
      return;
    }

    const url = frame.url();
    if (
      url.includes("analitica.auvp.com.br") ||
      url.includes("/api/auth/signin/callback")
    ) {
      console.error(`[mcp-auvp] Analítica: ${url}`);
    }
  });

  try {
    await page.goto(ANALITICA_HOME_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("ERR_ABORTED") && !message.includes("Timeout")) {
      throw error;
    }
  }

  try {
    await page.waitForURL(/analitica\.auvp\.com\.br/i, { timeout: 30_000 });
  } catch {
    /* SSO pode manter a navegação em andamento; seguimos aguardando cookies. */
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let header = "";
    try {
      header = buildCookieHeaderFromPlaywrightCookies(await context.cookies());
    } catch {
      break;
    }

    if (hasAnaliticaSessionCookie(header)) {
      const file = persistAnaliticaCookieHeader(header);
      console.error(`[mcp-auvp] Cookie do Analítica salvo em ${file}`);
      return file;
    }

    if (page.isClosed()) {
      break;
    }

    await page.waitForTimeout(500);
  }

  console.error(
    "[mcp-auvp] Cookies do Analítica ainda não disponíveis após visitar o site.",
  );
  return undefined;
}

async function captureComunidadeCookies(
  context: BrowserContext,
  page: Page,
  timeoutMs = 30_000,
): Promise<string | undefined> {
  console.error("[mcp-auvp] Coletando cookies da Comunidade…");
  console.error(
    "[mcp-auvp] Se necessário, faça login em comunidade.auvp.com.br na janela do navegador.",
  );

  try {
    await page.goto(COMUNIDADE_HOME_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("ERR_ABORTED") && !message.includes("Timeout")) {
      throw error;
    }
  }

  const deadline = Date.now() + timeoutMs;
  let lastReminderAt = Date.now();
  while (Date.now() < deadline) {
    let header = "";
    try {
      header = buildCookieHeaderFromPlaywrightCookies(await context.cookies());
    } catch {
      break;
    }

    if (hasComunidadeSessionCookie(header)) {
      const file = persistComunidadeCookieHeader(header);
      console.error(`[mcp-auvp] Cookie da Comunidade salvo em ${file}`);
      return file;
    }

    if (page.isClosed()) {
      break;
    }

    if (Date.now() - lastReminderAt >= 15_000) {
      console.error(
        "[mcp-auvp] Aguardando login na Comunidade… conclua o SSO na janela aberta.",
      );
      lastReminderAt = Date.now();
    }

    await page.waitForTimeout(500);
  }

  console.error(
    "[mcp-auvp] Cookies da Comunidade ainda não disponíveis após visitar o site.",
  );
  return undefined;
}

async function captureCarteiraToken(
  page: Page,
  timeoutMs = 60_000,
): Promise<string | undefined> {
  console.error("[mcp-auvp] Coletando token da Carteira…");
  try {
    await page.goto(CARTEIRA_HOME_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("ERR_ABORTED") && !message.includes("Timeout")) throw error;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !page.isClosed()) {
    const token = await page.evaluate(
      (key) => globalThis.localStorage?.getItem(key) ?? undefined,
      CARTEIRA_LOCAL_STORAGE_KEY,
    ).catch(() => undefined);
    if (token) {
      const file = persistCarteiraToken(token);
      console.error(`[mcp-auvp] Token da Carteira salvo em ${file}`);
      return file;
    }
    await page.waitForTimeout(500);
  }
  console.error("[mcp-auvp] Token da Carteira ainda não disponível após visitar o site.");
  return undefined;
}

function buildLoginResult(
  token: string,
  tokenFile: string,
  profileDir: string,
  method: BrowserLoginResult["method"],
  analiticaCookieFile?: string,
  comunidadeCookieFile?: string,
  carteiraTokenFile?: string,
): BrowserLoginResult {
  return {
    token,
    tokenFile,
    profileDir,
    method,
    analiticaCookieCaptured: Boolean(analiticaCookieFile),
    analiticaCookieFile,
    comunidadeCookieCaptured: Boolean(comunidadeCookieFile),
    comunidadeCookieFile,
    carteiraTokenCaptured: Boolean(carteiraTokenFile),
    carteiraTokenFile,
  };
}

async function captureSelectedModuleAuth(
  context: BrowserContext,
  page: Page,
  modules: readonly AuvpModule[],
  timeoutMs: number,
): Promise<{
  analiticaCookieFile?: string;
  comunidadeCookieFile?: string;
  carteiraTokenFile?: string;
}> {
  const analiticaCookieFile = modules.includes("analitica")
    ? await captureAnaliticaCookies(context, page, timeoutMs)
    : undefined;
  const comunidadeCookieFile = modules.includes("comunidade")
    ? await captureComunidadeCookies(context, page, timeoutMs)
    : undefined;
  const carteiraTokenFile = modules.includes("carteira")
    ? await captureCarteiraToken(page, timeoutMs)
    : undefined;
  return { analiticaCookieFile, comunidadeCookieFile, carteiraTokenFile };
}

async function tryReadTokenFromOpenInteractiveContext(): Promise<
  string | undefined
> {
  if (!openInteractiveContext) {
    return undefined;
  }

  try {
    const page = await getOrCreatePage(openInteractiveContext);
    return waitForAccessToken(openInteractiveContext, page, 1_000);
  } catch {
    return undefined;
  }
}

async function runSilentBrowserLogin(
  options: BrowserLoginOptions,
): Promise<BrowserLoginResult | undefined> {
  const waitTimeoutMs = options.waitTimeoutMs ?? 25_000;
  const modules = options.modules ?? ALL_AUVP_MODULES;
  const storageStatePath = getStorageStatePath();
  if (!existsSync(storageStatePath)) {
    return undefined;
  }

  const { chromium } = await loadPlaywright();
  let browser: Browser | undefined;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      storageState: storageStatePath,
      locale: "pt-BR",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto(DASHBOARD_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    const token = await waitForAccessToken(context, page, waitTimeoutMs);
    if (!token) {
      return undefined;
    }

    const savedTokenFile = persistBearerToken(token);
    const captured = await captureSelectedModuleAuth(context, page, modules, 30_000);
    await context.storageState({ path: storageStatePath });

    return buildLoginResult(
      token,
      savedTokenFile,
      getBrowserProfileDir(),
      "silent_browser",
      captured.analiticaCookieFile,
      captured.comunidadeCookieFile,
      captured.carteiraTokenFile,
    );
  } finally {
    await browser?.close();
  }
}

async function launchPersistentContext(
  profileDir: string,
  headless: boolean,
): Promise<BrowserContext> {
  const { chromium } = await loadPlaywright();
  const baseOptions = {
    headless,
    viewport: { width: 1280, height: 800 },
    locale: "pt-BR",
    args: headless
      ? []
      : ["--start-maximized", "--disable-backgrounding-occluded-windows"],
  } as const;

  if (headless) {
    return chromium.launchPersistentContext(profileDir, baseOptions);
  }

  try {
    return await chromium.launchPersistentContext(profileDir, {
      ...baseOptions,
      channel: "chrome",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[mcp-auvp] Chrome não disponível (${message}). Tentando Chromium embutido…`,
    );
    return chromium.launchPersistentContext(profileDir, baseOptions);
  }
}

async function runInteractiveBrowserLogin(
  options: BrowserLoginOptions,
): Promise<BrowserLoginResult | undefined> {
  const fresh = options.fresh ?? false;
  const waitTimeoutMs = options.waitTimeoutMs ?? 10 * 60_000;
  const modules = options.modules ?? ALL_AUVP_MODULES;
  const profileDir = getBrowserProfileDir();
  const tokenFile = getTokenFilePath();

  mkdirSync(getDefaultAuthDir(), { recursive: true });
  mkdirSync(join(tokenFile, ".."), { recursive: true });

  if (fresh && existsSync(profileDir)) {
    await closeInteractiveBrowser();
    rmSync(profileDir, { recursive: true, force: true });
    const stateFile = getStorageStatePath();
    if (existsSync(stateFile)) {
      rmSync(stateFile, { force: true });
    }
  }
  if (fresh) {
    for (const credentialFile of [
      tokenFile,
      getAnaliticaCookieFilePath(),
      getComunidadeCookieFilePath(),
      getCarteiraTokenFilePath(),
    ]) {
      if (existsSync(credentialFile)) rmSync(credentialFile, { force: true });
    }
  }

  const pendingToken = await tryReadTokenFromOpenInteractiveContext();
  if (pendingToken) {
    const savedTokenFile = persistBearerToken(pendingToken);
    const pendingPage = await getOrCreatePage(openInteractiveContext!);
    const captured = await captureSelectedModuleAuth(
      openInteractiveContext!, pendingPage, modules, 30_000,
    );
    await persistStorageState(openInteractiveContext!);
    await closeInteractiveBrowser();

    return buildLoginResult(
      pendingToken,
      savedTokenFile,
      profileDir,
      "interactive_browser",
      captured.analiticaCookieFile,
      captured.comunidadeCookieFile,
      captured.carteiraTokenFile,
    );
  }

  if (openInteractiveContext) {
    console.error(
      "[mcp-auvp] Já existe uma janela de login aberta. Conclua o login nela.",
    );
    return undefined;
  }

  const context = await launchPersistentContext(profileDir, false);
  openInteractiveContext = context;
  const page = await getOrCreatePage(context);

  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) {
      return;
    }

    const url = frame.url();
    if (url.includes("/auth/auvp/callback") || url.includes("financas.auvp.com.br")) {
      console.error("[mcp-auvp] Detectada navegação pós-login, aguardando token…");
    }
  });

  try {
    console.error(
      "[mcp-auvp] Abrindo navegador para login no SSO. A janela permanece aberta até o token ser capturado.",
    );

    await page.goto(LOGIN_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    let token = await readAccessToken(context);
    if (!token) {
      token = await waitForAccessToken(context, page, waitTimeoutMs);
    }

    if (!token) {
      console.error(
        "[mcp-auvp] Login ainda não concluído. A janela do navegador foi mantida aberta — finalize o login e chame auvp_ensure_auth novamente.",
      );
      return undefined;
    }

    const savedTokenFile = persistBearerToken(token);
    const captured = await captureSelectedModuleAuth(context, page, modules, 60_000);
    await persistStorageState(context);

    return buildLoginResult(
      token,
      savedTokenFile,
      profileDir,
      "interactive_browser",
      captured.analiticaCookieFile,
      captured.comunidadeCookieFile,
      captured.carteiraTokenFile,
    );
  } finally {
    if (openInteractiveContext) {
      const token = await readAccessToken(openInteractiveContext);
      if (token) {
        await closeInteractiveBrowser();
      }
    }
  }
}

export async function closeInteractiveBrowser(): Promise<void> {
  if (!openInteractiveContext) {
    return;
  }

  try {
    await openInteractiveContext.close();
  } catch {
    /* ignore */
  } finally {
    openInteractiveContext = null;
  }
}

async function runBrowserLoginInternal(
  options: BrowserLoginOptions = {},
): Promise<BrowserLoginResult | undefined> {
  const headless = options.headless ?? false;

  if (headless) {
    return runSilentBrowserLogin(options);
  }

  return runInteractiveBrowserLogin(options);
}

export interface RefreshSecondarySiteCookiesResult {
  analiticaCookieFile?: string;
  comunidadeCookieFile?: string;
}

export async function refreshSecondarySiteCookies(
  options: { headless?: boolean } = {},
): Promise<RefreshSecondarySiteCookiesResult> {
  const needsAnalitica = !loadPersistedAnaliticaCookieHeader();
  const needsComunidade = !loadPersistedComunidadeCookieHeader();
  if (!needsAnalitica && !needsComunidade) {
    return {};
  }

  const interactiveTimeoutMs = 10 * 60_000;
  const headlessTimeoutMs = 60_000;

  if (openInteractiveContext) {
    const page = await getOrCreatePage(openInteractiveContext);
    const analiticaCookieFile = needsAnalitica
      ? await captureAnaliticaCookies(
          openInteractiveContext,
          page,
          interactiveTimeoutMs,
        )
      : undefined;
    const comunidadeCookieFile = needsComunidade
      ? await captureComunidadeCookies(
          openInteractiveContext,
          page,
          interactiveTimeoutMs,
        )
      : undefined;
    return { analiticaCookieFile, comunidadeCookieFile };
  }

  const profileDir = getBrowserProfileDir();
  const headless = options.headless ?? false;
  if (!existsSync(profileDir)) {
    if (headless) {
      return {};
    }

    mkdirSync(getDefaultAuthDir(), { recursive: true });
    mkdirSync(profileDir, { recursive: true });
  }

  if (headless) {
    let context: BrowserContext | undefined;
    try {
      console.error(
        "[mcp-auvp] Tentando capturar cookies do Analítica e da Comunidade em segundo plano…",
      );
      context = await launchPersistentContext(profileDir, true);
      const page = await getOrCreatePage(context);
      const analiticaCookieFile = needsAnalitica
        ? await captureAnaliticaCookies(context, page, headlessTimeoutMs)
        : undefined;
      const comunidadeCookieFile = needsComunidade
        ? await captureComunidadeCookies(context, page, headlessTimeoutMs)
        : undefined;
      return { analiticaCookieFile, comunidadeCookieFile };
    } finally {
      await context?.close();
    }
  }

  console.error(
    "[mcp-auvp] Abrindo navegador visível para concluir login no Analítica e na Comunidade…",
  );

  let context: BrowserContext;
  try {
    context = await launchPersistentContext(profileDir, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mcp-auvp] Falha ao abrir o navegador: ${message}`);
    throw error;
  }

  openInteractiveContext = context;
  const page = await getOrCreatePage(context);

  try {
    await page.bringToFront();

    const analiticaCookieFile = needsAnalitica
      ? await captureAnaliticaCookies(context, page, interactiveTimeoutMs)
      : undefined;
    const comunidadeCookieFile = needsComunidade
      ? await captureComunidadeCookies(context, page, interactiveTimeoutMs)
      : undefined;

    await persistStorageState(context);

    const capturedAnalitica = !needsAnalitica || Boolean(analiticaCookieFile);
    const capturedComunidade =
      !needsComunidade || Boolean(comunidadeCookieFile);
    if (capturedAnalitica && capturedComunidade) {
      console.error(
        "[mcp-auvp] Cookies secundários capturados. Fechando navegador.",
      );
      await closeInteractiveBrowser();
    } else {
      console.error(
        "[mcp-auvp] Navegador mantido aberto — conclua o login e chame auvp_ensure_auth.",
      );
    }

    return { analiticaCookieFile, comunidadeCookieFile };
  } catch (error) {
    console.error(
      "[mcp-auvp] Navegador mantido aberto após erro na captura de cookies secundários.",
    );
    throw error;
  }
}

export async function refreshAnaliticaCookiesOnly(
  options: { headless?: boolean } = {},
): Promise<string | undefined> {
  const result = await refreshSecondarySiteCookies(options);
  return result.analiticaCookieFile;
}

export async function refreshComunidadeCookiesOnly(
  options: { headless?: boolean } = {},
): Promise<string | undefined> {
  const result = await refreshSecondarySiteCookies(options);
  return result.comunidadeCookieFile;
}

export async function runBrowserLogin(
  options: BrowserLoginOptions = {},
): Promise<BrowserLoginResult | undefined> {
  if (activeLogin) {
    console.error(
      "[mcp-auvp] Login já em andamento, aguardando a tentativa atual…",
    );
    return activeLogin;
  }

  activeLogin = runBrowserLoginInternal(options).finally(() => {
    activeLogin = null;
  });

  return activeLogin;
}
