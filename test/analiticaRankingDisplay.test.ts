import { describe, expect, it } from "vitest";
import { formatAnaliticaRankingResponse } from "../src/analitica/ranking-display.js";
import type { AnaliticaRankingPayload } from "../src/analitica/ranking.js";

const samplePayload: AnaliticaRankingPayload = {
  key: "dividend_yield",
  name: "Maiores dividend yield",
  associated_key: "dividend_yield",
  order: "desc",
  mask: "PERCENTAGE",
  data: [
    {
      code: "SYNE3",
      type: "stock",
      value: 73.96,
      sector: "financeiro",
      quote: "3.5",
      name: "SYN PROP E TECH S.A.",
      indicators: {
        p_l: { value: 8.31 },
        p_vp: { value: 0.79 },
        valor_mercado: { value: 544940668.65 },
        roe: { value: 9.47 },
        roa: { value: 2.92 },
      },
      sector_average: {
        "10_years": 6.94,
        "12_months": 6.55,
      },
    },
  ],
  pagination: {
    page: 2,
    limit: 10,
    total_pages: 27,
  },
};

describe("formatAnaliticaRankingResponse", () => {
  it("maps ranking rows to the table columns shown on Analitica", () => {
    const formatted = formatAnaliticaRankingResponse(samplePayload, {
      viabilityByCode: new Map([["SYNE3", "yellow"]]),
    });

    expect(formatted.ranking.key).toBe("dividend_yield");
    expect(formatted.data[0]).toEqual({
      position: 11,
      code: "SYNE3",
      name: "SYN PROP E TECH S.A.",
      sector: "financeiro",
      columns: {
        cotacao: "3.5",
        viabilidade: "yellow",
        viabilidade_label: "amarela",
        metric_key: "dividend_yield",
        metric_label: "Dividend yield",
        metric_value: 73.96,
        p_l: 8.31,
        p_vp: 0.79,
        valor_mercado: 544940668.65,
        roe: 9.47,
        roa: 2.92,
        media_hist_setor: 6.94,
        media_atual_setor: 6.55,
      },
    });
    expect(formatted.data[0]?.indicators).toBeUndefined();
  });

  it("keeps raw indicators only when requested", () => {
    const formatted = formatAnaliticaRankingResponse(samplePayload, {
      includeIndicators: true,
    });

    expect(formatted.data[0]?.indicators).toEqual(samplePayload.data[0]?.indicators);
  });
});
