import { describe, expect, it } from "vitest";
import {
  parseAnaliticaRankingFromRsc,
  type AnaliticaRankingPayload,
} from "../src/analitica/ranking.js";

const samplePayload: AnaliticaRankingPayload = {
  key: "dividend_yield",
  type: "stock",
  name: "Maiores dividend yield",
  description: "Indica o retorno obtido por meio dos proventos.",
  associated_key: "dividend_yield",
  order: "desc",
  mask: "PERCENTAGE",
  data: [
    {
      code: "SYNE3",
      type: "stock",
      value: 73.96,
      currency: "BRL",
      sector: "financeiro",
      quote: "3.5",
      name: "SYN PROP E TECH S.A.",
    },
    {
      code: "SCAR3",
      type: "stock",
      value: 55.26,
      currency: "BRL",
      sector: "consumo-cíclico",
      quote: "12.24",
      name: "SAO CARLOS EMPREEND E PARTICIPACOES S.A.",
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    total_pages: 27,
  },
};

function toRscPayload(payload: AnaliticaRankingPayload): string {
  const json = JSON.stringify(payload);
  const escaped = json.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `<html><body>prefix ${escaped} suffix</body></html>`;
}

describe("parseAnaliticaRankingFromRsc", () => {
  it("extracts ranking data and pagination from an RSC payload", () => {
    const parsed = parseAnaliticaRankingFromRsc(toRscPayload(samplePayload));

    expect(parsed.key).toBe("dividend_yield");
    expect(parsed.data).toHaveLength(2);
    expect(parsed.data[0]?.code).toBe("SYNE3");
    expect(parsed.pagination).toEqual({
      page: 1,
      limit: 10,
      total_pages: 27,
    });
  });

  it("throws when the ranking payload is missing", () => {
    expect(() => parseAnaliticaRankingFromRsc("<html></html>")).toThrow(
      "Could not find ranking payload",
    );
  });
});
