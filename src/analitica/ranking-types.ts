export const analiticaRankingTypeValues = [
  "upside_graham",
  "upside_bazin",
  "dividend_yield",
  "valor_mercado",
  "receita_liquida",
  "lucro_liquido",
  "caixa",
  "roe",
  "margem_liquida",
  "p_l",
  "cagr_receita_5_anos",
  "cagr_lucro_liquido_5_anos",
  "altas_30_dias",
  "altas_12_meses",
  "roic",
  "sem_prejuizo",
  "divida_liquida_ebitda",
  "earning_yield",
] as const;

export type AnaliticaRankingType =
  (typeof analiticaRankingTypeValues)[number];

export function buildAnaliticaRankingPath(
  segment: "acoes" | "stocks",
  rankingType: string,
): string {
  return `/rankings/${segment}/${rankingType}`;
}
