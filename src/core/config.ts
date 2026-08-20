import { AuvpConfigError } from "./errors.js";

export const DEFAULT_API_BASE_URL = "https://financas-api.auvp.com.br";
export const DEFAULT_ORIGIN = "https://financas.auvp.com.br";
export const DEFAULT_ANALITICA_BASE_URL = "https://analitica.auvp.com.br";
export const DEFAULT_ANALITICA_ORIGIN = "https://analitica.auvp.com.br";
export const DEFAULT_COMUNIDADE_BASE_URL = "https://comunidade.auvp.com.br";
export const DEFAULT_COMUNIDADE_ORIGIN = "https://comunidade.auvp.com.br";
export const DEFAULT_CARTEIRA_BASE_URL =
  "https://ferramentas-backend.auvp.com.br";
export const DEFAULT_CARTEIRA_ORIGIN = "https://ferramentas.auvp.com.br";
export const DEFAULT_DICIONARIO_BASE_URL = "https://worker.auvp.com.br";
export const DEFAULT_SSO_BASE_URL = "https://sso.auvp.com.br";
export const DEFAULT_SSO_REALM = "AUVP";
export const DEFAULT_SSO_CLIENT_ID = "financas";
export const DEFAULT_SSO_SCOPE = "email profile openid";
export const DEFAULT_TIMEOUT_MS = 30_000;

export type StringHeaders = Record<string, string>;

export interface AuvpConfig {
  apiBaseUrl: string;
  origin: string;
  analiticaBaseUrl: string;
  analiticaOrigin: string;
  comunidadeBaseUrl: string;
  comunidadeOrigin: string;
  carteiraBaseUrl: string;
  carteiraOrigin: string;
  dicionarioBaseUrl: string;
  timeoutMs: number;
  extraHeaders: StringHeaders;
  ssoBaseUrl: string;
  ssoRealm: string;
  ssoClientId: string;
  ssoRedirectUri: string;
  ssoScope: string;
}

export function parseExtraHeaders(value: string | undefined): StringHeaders {
  if (!value || value.trim().length === 0) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new AuvpConfigError(
      "AUVP_FINANCAS_EXTRA_HEADERS must be valid JSON.",
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new AuvpConfigError(
      "AUVP_FINANCAS_EXTRA_HEADERS must be a JSON object.",
    );
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, headerValue]) => {
      if (
        typeof headerValue !== "string" &&
        typeof headerValue !== "number" &&
        typeof headerValue !== "boolean"
      ) {
        throw new AuvpConfigError(
          `Header "${key}" in AUVP_FINANCAS_EXTRA_HEADERS must be a string, number, or boolean.`,
        );
      }

      return [key, String(headerValue)];
    }),
  );
}

export function loadConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AuvpConfig {
  const timeoutMs = Number(
    env.AUVP_FINANCAS_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS,
  );

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new AuvpConfigError(
      "AUVP_FINANCAS_TIMEOUT_MS must be a positive number.",
    );
  }

  return {
    apiBaseUrl: env.AUVP_FINANCAS_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    origin: env.AUVP_FINANCAS_ORIGIN ?? DEFAULT_ORIGIN,
    analiticaBaseUrl:
      env.AUVP_ANALITICA_BASE_URL ?? DEFAULT_ANALITICA_BASE_URL,
    analiticaOrigin: env.AUVP_ANALITICA_ORIGIN ?? DEFAULT_ANALITICA_ORIGIN,
    comunidadeBaseUrl:
      env.AUVP_COMUNIDADE_BASE_URL ?? DEFAULT_COMUNIDADE_BASE_URL,
    comunidadeOrigin:
      env.AUVP_COMUNIDADE_ORIGIN ?? DEFAULT_COMUNIDADE_ORIGIN,
    carteiraBaseUrl:
      env.AUVP_CARTEIRA_BASE_URL ?? DEFAULT_CARTEIRA_BASE_URL,
    carteiraOrigin: env.AUVP_CARTEIRA_ORIGIN ?? DEFAULT_CARTEIRA_ORIGIN,
    dicionarioBaseUrl:
      env.AUVP_DICIONARIO_BASE_URL ?? DEFAULT_DICIONARIO_BASE_URL,
    timeoutMs,
    extraHeaders: parseExtraHeaders(env.AUVP_FINANCAS_EXTRA_HEADERS),
    ssoBaseUrl: env.AUVP_FINANCAS_SSO_BASE_URL ?? DEFAULT_SSO_BASE_URL,
    ssoRealm: env.AUVP_FINANCAS_SSO_REALM ?? DEFAULT_SSO_REALM,
    ssoClientId:
      env.AUVP_FINANCAS_SSO_CLIENT_ID ?? DEFAULT_SSO_CLIENT_ID,
    ssoRedirectUri:
      env.AUVP_FINANCAS_SSO_REDIRECT_URI ??
      `${env.AUVP_FINANCAS_API_BASE_URL ?? DEFAULT_API_BASE_URL}/auth/auvp/callback`,
    ssoScope: env.AUVP_FINANCAS_SSO_SCOPE ?? DEFAULT_SSO_SCOPE,
  };
}
