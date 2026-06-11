import { describe, expect, it } from "vitest";
import {
  analiticaRankingTypeValues,
  buildAnaliticaRankingPath,
} from "../src/analitica/ranking-types.js";

describe("analiticaRankingTypes", () => {
  it("includes the acoes ranking slugs observed on Analitica", () => {
    for (const slug of [
      "p_l",
      "dividend_yield",
      "upside_graham",
      "upside_bazin",
      "valor_mercado",
      "receita_liquida",
      "caixa",
      "roe",
      "margem_liquida",
      "cagr_receita_5_anos",
      "cagr_lucro_liquido_5_anos",
      "altas_30_dias",
      "altas_12_meses",
      "roic",
      "sem_prejuizo",
      "divida_liquida_ebitda",
    ]) {
      expect(analiticaRankingTypeValues).toContain(slug);
    }
  });

  it("builds ranking page paths", () => {
    expect(buildAnaliticaRankingPath("acoes", "p_l")).toBe(
      "/rankings/acoes/p_l",
    );
    expect(buildAnaliticaRankingPath("stocks", "dividend_yield")).toBe(
      "/rankings/stocks/dividend_yield",
    );
  });
});
