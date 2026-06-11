import type { AuvpConfig, StringHeaders } from "../core/config.js";
import { loadConfigFromEnv } from "../core/config.js";
import type { AuvpFinancasClient } from "../core/http-client.js";

export interface CreateSsoLoginUrlArgs {
  state?: string;
  scope?: string;
  redirectUri?: string;
}

export interface CompleteSsoLoginArgs {
  callbackUrl?: string;
  code?: string;
  state?: string;
  followRedirects?: boolean;
}

export interface SsoLoginUrlResult {
  loginUrl: string;
  state: string;
  redirectUri: string;
  clientId: string;
  scope: string;
}

export interface SsoCompletionResult {
  status: number;
  finalUrl: string;
  redirectCount: number;
  location?: string;
  hasBearerToken: boolean;
  hasSessionCookie: boolean;
  cookieNames: string[];
  capturedAuthMaterial: boolean;
}

export async function createSsoLoginUrl(
  client: AuvpFinancasClient,
  args: CreateSsoLoginUrlArgs = {},
  config: AuvpConfig = loadConfigFromEnv(),
): Promise<SsoLoginUrlResult> {
  if (args.state || args.scope || args.redirectUri) {
    throw new Error(
      "Custom state, scope, and redirectUri are not supported. The AUVP API must issue the OIDC state via /auth/redirect-url.",
    );
  }

  const redirectRequestUrl = new URL("/auth/redirect-url", config.apiBaseUrl);
  redirectRequestUrl.searchParams.set("provider", "auvp");

  const response = await client.fetchRaw(redirectRequestUrl, {
    method: "GET",
    redirect: "manual",
    headers: redirectHeaders(config.origin),
  });

  const location = response.headers.get("location");
  if (!location) {
    const responseText = await response.text();
    throw new Error(
      `AUVP API did not return an SSO redirect for ${redirectRequestUrl.toString()}. HTTP ${response.status}.${responseText.trim() ? ` Body: ${responseText.trim().slice(0, 500)}` : ""}`,
    );
  }

  const loginUrl = new URL(location, redirectRequestUrl);
  const state = loginUrl.searchParams.get("state");

  if (!state) {
    throw new Error(
      `AUVP SSO redirect URL is missing the state query parameter: ${loginUrl.toString()}`,
    );
  }

  return {
    loginUrl: loginUrl.toString(),
    state,
    redirectUri:
      loginUrl.searchParams.get("redirect_uri") ?? config.ssoRedirectUri,
    clientId: loginUrl.searchParams.get("client_id") ?? config.ssoClientId,
    scope: decodeScope(loginUrl.searchParams.get("scope") ?? config.ssoScope),
  };
}

export async function completeSsoLogin(
  client: AuvpFinancasClient,
  args: CompleteSsoLoginArgs,
  config: AuvpConfig = loadConfigFromEnv(),
): Promise<SsoCompletionResult> {
  let currentUrl = buildCallbackUrl(args, config);
  let response: Response | undefined;
  let redirectCount = 0;
  const followRedirects = args.followRedirects ?? true;

  while (true) {
    response = await client.fetchRaw(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: callbackHeaders(config.origin),
    });

    const responseText = await response.text();
    captureBearerTokenFromJsonResponse(client, responseText);

    const location = response.headers.get("location");
    if (
      !followRedirects ||
      !location ||
      response.status < 300 ||
      response.status >= 400 ||
      redirectCount >= 5
    ) {
      const authStatus = client.getAuthStatus();
      return {
        status: response.status,
        finalUrl: currentUrl.toString(),
        redirectCount,
        location: location ?? undefined,
        ...authStatus,
        capturedAuthMaterial:
          authStatus.hasBearerToken || authStatus.hasSessionCookie,
      };
    }

    currentUrl = new URL(location, currentUrl);
    redirectCount += 1;
  }
}

export function buildCallbackUrl(
  args: CompleteSsoLoginArgs,
  config: AuvpConfig = loadConfigFromEnv(),
): URL {
  if (args.callbackUrl) {
    return new URL(args.callbackUrl);
  }

  if (!args.code) {
    throw new Error("Either callbackUrl or code must be provided.");
  }

  const callbackUrl = new URL(config.ssoRedirectUri);
  callbackUrl.searchParams.set("code", args.code);

  if (args.state) {
    callbackUrl.searchParams.set("state", args.state);
  }

  return callbackUrl;
}

function redirectHeaders(origin: string): StringHeaders {
  return {
    accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    referer: `${origin}/sign-in`,
  };
}

function decodeScope(scope: string): string {
  return scope.replace(/\+/g, " ");
}

function callbackHeaders(origin: string): StringHeaders {
  return {
    accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    referer: `${origin}/`,
  };
}

function captureBearerTokenFromJsonResponse(
  client: AuvpFinancasClient,
  responseText: string,
): void {
  if (!responseText.trim().startsWith("{")) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    return;
  }

  const accessToken = findAccessToken(parsed);
  if (accessToken) {
    client.setBearerToken(accessToken);
  }
}

function findAccessToken(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.access_token === "string") {
    const tokenType =
      typeof record.token_type === "string"
        ? record.token_type.toLowerCase()
        : "bearer";

    return tokenType === "bearer" ? record.access_token : undefined;
  }

  return findAccessToken(record.data);
}
