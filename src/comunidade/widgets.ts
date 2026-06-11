import type { AuvpFinancasClient } from "../core/http-client.js";
import type { QueryParams } from "../core/query.js";
import { decodeHtmlEntities, stripHtml } from "./html-utils.js";

export type ComunidadeLeaderboardTime = "week" | "month" | "year" | "all";

export interface ComunidadeLeaderboardEntry {
  position: number;
  name: string;
  profileUrl: string;
  score: number;
}

export interface ComunidadeLeaderboardResult {
  kind: "top_contributors" | "most_solved";
  time: ComunidadeLeaderboardTime;
  limit: number;
  entries: ComunidadeLeaderboardEntry[];
}

export interface ComunidadeLeaderboardOptions {
  time?: ComunidadeLeaderboardTime;
  limit?: number;
}

const WIDGET_PATH = "/index.php";

export async function getComunidadeTopContributors(
  client: AuvpFinancasClient,
  options: ComunidadeLeaderboardOptions = {},
): Promise<ComunidadeLeaderboardResult> {
  const time = options.time ?? "week";
  const limit = options.limit ?? 5;
  const html = await client.getComunidadeAjaxText(
    WIDGET_PATH,
    buildWidgetQuery("topContributors", time, limit),
  );

  return {
    kind: "top_contributors",
    time,
    limit,
    entries: parseLeaderboardHtml(html),
  };
}

export async function getComunidadeMostSolved(
  client: AuvpFinancasClient,
  options: ComunidadeLeaderboardOptions = {},
): Promise<ComunidadeLeaderboardResult> {
  const time = options.time ?? "week";
  const limit = options.limit ?? 5;
  const html = await client.getComunidadeAjaxText(
    WIDGET_PATH,
    buildWidgetQuery("mostSolved", time, limit),
  );

  return {
    kind: "most_solved",
    time,
    limit,
    entries: parseLeaderboardHtml(html),
  };
}

function buildWidgetQuery(
  widget: "topContributors" | "mostSolved",
  time: ComunidadeLeaderboardTime,
  limit: number,
): QueryParams {
  return {
    app: "core",
    module: "system",
    controller: "ajax",
    do: widget,
    time,
    limit,
    orientation: "vertical",
  };
}

export function parseLeaderboardHtml(html: string): ComunidadeLeaderboardEntry[] {
  const entries: ComunidadeLeaderboardEntry[] = [];
  const blocks = html.split(/<li class=['"]ipsDataItem['"]>/i);

  for (const block of blocks.slice(1)) {
    const chunk = block.split(/<\/li>/i)[0] ?? "";
    const positionMatch = chunk.match(/<strong>(\d+)<\/strong>/i);
    const profileMatch = chunk.match(
      /<a[^>]*href=["']([^"']*\/profile\/[^"']+)["'][^>]*>([^<]+)<\/a>/i,
    );
    const scoreMatch =
      chunk.match(/ipsRepBadge[^>]*>[\s\S]*?(\d+)/i) ??
      chunk.match(/<span[^>]*class=["'][^"']*cPoints[^"']*["'][^>]*>(\d+)/i) ??
      chunk.match(/>(\d+)</);

    if (!profileMatch) {
      continue;
    }

    entries.push({
      position: positionMatch ? Number(positionMatch[1]) : entries.length + 1,
      name: decodeHtmlEntities(stripHtml(profileMatch[2])),
      profileUrl: profileMatch[1],
      score: scoreMatch ? Number(scoreMatch[1]) : 0,
    });
  }

  return entries;
}
