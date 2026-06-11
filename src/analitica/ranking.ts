import {
  formatAnaliticaRankingResponse,
  type AnaliticaRankingTableResponse,
} from "./ranking-display.js";
import type { AuvpFinancasClient } from "../core/http-client.js";
import { buildAnaliticaRankingPath } from "./ranking-types.js";
import { AuvpApiError } from "../core/errors.js";

export const ANALITICA_RANKING_RSC_TOKEN = "4soq9";
export const ANALITICA_RANKING_REQUEST_TIMEOUT_MS = 180_000;

const RSC_RANKING_DATA_MARKER = '\\"data\\":[{\\"code\\":';

export interface AnaliticaRankingPagination {
  page: number;
  limit: number;
  total_pages: number;
}

export interface AnaliticaRankingItem {
  code: string;
  type: string;
  value: number;
  currency?: string;
  sector?: string;
  quote?: string;
  name?: string;
  indicators?: Record<string, unknown>;
  sector_average?: Record<string, unknown>;
}

export interface AnaliticaRankingPayload {
  key?: string;
  type?: string;
  name?: string;
  description?: string;
  associated_table?: string;
  associated_key?: string;
  order?: string;
  is_unique?: boolean;
  is_list?: boolean;
  mask?: string;
  data: AnaliticaRankingItem[];
  pagination: AnaliticaRankingPagination;
}

export function parseAnaliticaRankingFromRsc(text: string): AnaliticaRankingPayload {
  const markerIndex = text.indexOf(RSC_RANKING_DATA_MARKER);
  if (markerIndex === -1) {
    throw new AuvpApiError(
      "Could not find ranking payload in Analitica RSC response.",
    );
  }

  const objectStart = text.lastIndexOf("{", markerIndex);
  if (objectStart === -1) {
    throw new AuvpApiError(
      "Could not locate ranking JSON object in Analitica RSC response.",
    );
  }

  let depth = 0;
  let objectEnd = -1;
  for (let index = objectStart; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        objectEnd = index + 1;
        break;
      }
    }
  }

  if (objectEnd === -1) {
    throw new AuvpApiError(
      "Could not parse ranking JSON object from Analitica RSC response.",
    );
  }

  const escapedJson = text.slice(objectStart, objectEnd);
  const json = escapedJson
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

  const parsed = JSON.parse(json) as AnaliticaRankingPayload;
  if (!Array.isArray(parsed.data) || !parsed.pagination) {
    throw new AuvpApiError(
      "Analitica ranking payload is missing data or pagination.",
    );
  }

  return parsed;
}

async function fetchViabilidadeByCode(
  client: AuvpFinancasClient,
  codes: readonly string[],
): Promise<Map<string, string>> {
  const viabilityByCode = new Map<string, string>();

  await Promise.all(
    codes.map(async (code) => {
      try {
        const tooltip = (await client.postAnalitica(
          "/api/bff",
          { code },
          { key: "asset-image-tooltip" },
        )) as { rating?: string };

        if (typeof tooltip.rating === "string") {
          viabilityByCode.set(code, tooltip.rating);
        }
      } catch {
        // Keep ranking rows even when a tooltip lookup fails.
      }
    }),
  );

  return viabilityByCode;
}

export async function fetchAnaliticaRanking(
  client: AuvpFinancasClient,
  options: {
    segment: "acoes" | "stocks";
    rankingType: string;
    page: number;
    limit: number;
    includeViabilidade?: boolean;
    includeIndicators?: boolean;
  },
): Promise<AnaliticaRankingTableResponse> {
  const path = buildAnaliticaRankingPath(
    options.segment,
    options.rankingType,
  );
  const text = await client.getAnaliticaText(
    path,
    {
      page: options.page,
      limit: options.limit,
      _rsc: ANALITICA_RANKING_RSC_TOKEN,
    },
    { timeoutMs: ANALITICA_RANKING_REQUEST_TIMEOUT_MS },
  );

  const payload = parseAnaliticaRankingFromRsc(text);
  const viabilityByCode = options.includeViabilidade
    ? await fetchViabilidadeByCode(
        client,
        payload.data.map((item) => item.code),
      )
    : undefined;

  return formatAnaliticaRankingResponse(payload, {
    includeIndicators: options.includeIndicators,
    viabilityByCode,
  });
}
