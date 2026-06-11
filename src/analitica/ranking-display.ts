import type {
  AnaliticaRankingItem,
  AnaliticaRankingPayload,
} from "./ranking.js";

const RANKING_METRIC_LABELS: Record<string, string> = {
  upside_graham: "Upside Graham",
  upside_bazin: "Upside Bazin",
  dividend_yield: "Dividend yield",
  valor_mercado: "Valor de mercado",
  receita_liquida: "Receita líquida",
  lucro_liquido: "Lucro líquido",
  caixa: "Disponibilidades",
  roe: "ROE",
  margem_liquida: "Margem líquida",
  p_l: "P/L",
  cagr_receita_5_anos: "CAGR receita (5A)",
  cagr_lucro_liquido_5_anos: "CAGR Lucro Lq. (5A)",
  altas_30_dias: "Variação (30 dias)",
  altas_12_meses: "Variação (12 meses)",
  roic: "ROIC",
  sem_prejuizo: "Valor de mercado",
  divida_liquida_ebitda: "Dív. líq./EBITDA",
  earning_yield: "Earning yield",
};

const VIABILITY_LABELS: Record<string, string> = {
  blue: "azul",
  green: "verde",
  yellow: "amarela",
  red: "vermelha",
};

export interface AnaliticaRankingTableColumns {
  cotacao: string | null;
  viabilidade: string | null;
  viabilidade_label: string | null;
  metric_key: string;
  metric_label: string;
  metric_value: number | null;
  p_l: number | null;
  p_vp: number | null;
  valor_mercado: number | null;
  roe: number | null;
  roa: number | null;
  media_hist_setor: number | null;
  media_atual_setor: number | null;
}

export interface AnaliticaRankingTableRow {
  position: number;
  code: string;
  name: string | null;
  sector: string | null;
  columns: AnaliticaRankingTableColumns;
  indicators?: Record<string, unknown>;
}

export interface AnaliticaRankingTableResponse {
  ranking: {
    key: string | null;
    name: string | null;
    description: string | null;
    order: string | null;
    mask: string | null;
  };
  pagination: AnaliticaRankingPayload["pagination"];
  data: AnaliticaRankingTableRow[];
}

interface IndicatorEntry {
  value?: number | null;
}

function indicatorValue(
  indicators: Record<string, unknown> | undefined,
  key: string,
): number | null {
  const entry = indicators?.[key];
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const value = (entry as IndicatorEntry).value;
  return typeof value === "number" ? value : null;
}

function sectorAverage(
  sectorAverageValues: Record<string, unknown> | undefined,
  key: "10_years" | "12_months",
): number | null {
  const value = sectorAverageValues?.[key];
  return typeof value === "number" ? value : null;
}

function rankingMetricLabel(
  metricKey: string,
  rankingName?: string,
): string {
  return RANKING_METRIC_LABELS[metricKey] ?? rankingName ?? metricKey;
}

function buildTableColumns(
  item: AnaliticaRankingItem,
  metricKey: string,
  rankingName?: string,
  viabilityByCode?: ReadonlyMap<string, string>,
): AnaliticaRankingTableColumns {
  const viability = viabilityByCode?.get(item.code) ?? null;

  return {
    cotacao: item.quote ?? null,
    viabilidade: viability,
    viabilidade_label: viability ? (VIABILITY_LABELS[viability] ?? viability) : null,
    metric_key: metricKey,
    metric_label: rankingMetricLabel(metricKey, rankingName),
    metric_value: typeof item.value === "number" ? item.value : null,
    p_l: indicatorValue(item.indicators, "p_l"),
    p_vp: indicatorValue(item.indicators, "p_vp"),
    valor_mercado: indicatorValue(item.indicators, "valor_mercado"),
    roe: indicatorValue(item.indicators, "roe"),
    roa: indicatorValue(item.indicators, "roa"),
    media_hist_setor: sectorAverage(item.sector_average, "10_years"),
    media_atual_setor: sectorAverage(item.sector_average, "12_months"),
  };
}

export function formatAnaliticaRankingResponse(
  payload: AnaliticaRankingPayload,
  options: {
    includeIndicators?: boolean;
    viabilityByCode?: ReadonlyMap<string, string>;
  } = {},
): AnaliticaRankingTableResponse {
  const metricKey = payload.associated_key ?? payload.key ?? "value";

  return {
    ranking: {
      key: payload.key ?? payload.associated_key ?? null,
      name: payload.name ?? null,
      description: payload.description ?? null,
      order: payload.order ?? null,
      mask: payload.mask ?? null,
    },
    pagination: payload.pagination,
    data: payload.data.map((item, index) => {
      const row: AnaliticaRankingTableRow = {
        position:
          (payload.pagination.page - 1) * payload.pagination.limit + index + 1,
        code: item.code,
        name: item.name ?? null,
        sector: item.sector ?? null,
        columns: buildTableColumns(
          item,
          metricKey,
          payload.name,
          options.viabilityByCode,
        ),
      };

      if (options.includeIndicators) {
        row.indicators = item.indicators;
      }

      return row;
    }),
  };
}
