import type { AuvpFinancasClient } from "../core/http-client.js";
import { getComunidadeForumById, resolveComunidadeForumIds } from "./forums.js";
import type { QueryParams } from "../core/query.js";

export type ComunidadeSearchMode = "and" | "or";
export type ComunidadeSearchIn = "all" | "titles";
export type ComunidadeContentType =
  | "forums_topic"
  | "core_statuses_status"
  | "calendar_event"
  | "cms_pages_pageitem"
  | "cms_records1"
  | "";
export type ComunidadeSortBy = "relevancy" | "newest";

export interface ComunidadeSearchOptions {
  query: string;
  forums?: readonly (string | number)[];
  searchMode?: ComunidadeSearchMode;
  searchIn?: ComunidadeSearchIn;
  contentType?: ComunidadeContentType;
  sortBy?: ComunidadeSortBy;
  page?: number;
}

export interface ComunidadeSearchItem {
  title: string;
  url: string;
  author?: string;
  forum?: string;
  forumId?: number;
  excerpt?: string;
  date?: string;
  dateLabel?: string;
  replies?: number;
  contentType?: string;
  timestamp?: number;
}

export interface ComunidadeSearchResult {
  query: string;
  title: string;
  total: number;
  page: number;
  sortBy: ComunidadeSortBy;
  searchMode: ComunidadeSearchMode;
  searchIn: ComunidadeSearchIn;
  contentType: ComunidadeContentType;
  forums?: Array<{ id: number; name: string }>;
  results: ComunidadeSearchItem[];
  csrfKey?: string;
}

interface ComunidadeSearchApiResponse {
  filters?: string;
  content?: string;
  title?: string;
}

export async function searchComunidade(
  client: AuvpFinancasClient,
  options: ComunidadeSearchOptions,
): Promise<ComunidadeSearchResult> {
  const searchMode = options.searchMode ?? "and";
  const searchIn = options.searchIn ?? "all";
  const contentType = options.contentType ?? "forums_topic";
  const sortBy = options.sortBy ?? "relevancy";
  const page = options.page ?? 1;

  const query: QueryParams = {
    q: options.query,
    search_and_or: searchMode,
    search_in: searchIn,
    sortby: sortBy,
  };

  if (page > 1) {
    query.page = page;
  }

  if (contentType) {
    query.type = contentType;
  }

  let forumIds: number[] | undefined;
  if (options.forums && options.forums.length > 0) {
    forumIds = resolveComunidadeForumIds(options.forums);
    if (forumIds.length > 0) {
      query.nodes = forumIds.join(",");
    }
  }

  const response = (await client.getComunidade(
    "/search/",
    query,
  )) as ComunidadeSearchApiResponse;

  const contentHtml = response.content ?? "";
  const total = extractResultCount(contentHtml);
  const csrfKey = extractCsrfKey(response.filters ?? "");
  const results = parseComunidadeSearchHtml(contentHtml);

  return {
    query: options.query,
    title: stripHtml(response.title ?? ""),
    total,
    page,
    sortBy,
    searchMode,
    searchIn,
    contentType,
    forums: forumIds?.map((id) => ({
      id,
      name: getComunidadeForumById(id)?.name ?? String(id),
    })),
    results,
    csrfKey,
  };
}

export function extractCsrfKey(filtersHtml: string): string | undefined {
  const match = filtersHtml.match(
    /name=["']csrfKey["']\s+value=["']([^"']+)["']/i,
  );
  return match?.[1];
}

export function extractResultCount(contentHtml: string): number {
  const match = contentHtml.match(/Encontrou\s+(\d+)\s+resultados/i);
  return match ? Number(match[1]) : 0;
}

export function parseComunidadeSearchHtml(contentHtml: string): ComunidadeSearchItem[] {
  const items: ComunidadeSearchItem[] = [];
  const opener = /<li[^>]*data-role=['"]activityItem['"][^>]*>/gi;
  const starts: number[] = [];

  for (const match of contentHtml.matchAll(opener)) {
    if (match.index !== undefined) {
      starts.push(match.index);
    }
  }

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end =
      index + 1 < starts.length ? starts[index + 1] : contentHtml.length;
    const chunk = contentHtml.slice(start, end);
    const closingIndex = chunk.lastIndexOf("</li>");
    if (closingIndex < 0) {
      continue;
    }

    const fullBlock = chunk.slice(0, closingIndex + "</li>".length);
    const innerBlock = fullBlock
      .replace(/^<li[^>]*>/i, "")
      .replace(/<\/li>\s*$/i, "");
    const parsed = parseSearchItemBlock(innerBlock, fullBlock);
    if (parsed) {
      items.push(parsed);
    }
  }

  return items;
}

function parseSearchItemBlock(
  block: string,
  fullBlock: string,
): ComunidadeSearchItem | undefined {
  const linkMatch =
    block.match(
      /<a\s+href=['"]([^'"]+)['"][^>]*data-searchable[^>]*>\s*([^<]+?)\s*<\/a>/i,
    ) ??
    block.match(
      /<a[^>]*data-searchable[^>]*href=['"]([^'"]+)['"][^>]*>\s*([^<]+?)\s*<\/a>/i,
    );
  if (!linkMatch) {
    return undefined;
  }

  const statusMatch = block.match(
    /<p[^>]*class=['"][^'"]*ipsStreamItem_status[^'"]*['"][^>]*>([\s\S]*?)<\/p>/i,
  );
  const author = extractFirstProfileName(statusMatch?.[1] ?? block);
  const forum = extractForumName(statusMatch?.[1] ?? block);
  const forumId = extractForumId(statusMatch?.[1] ?? block);
  const excerpt = extractExcerpt(block);
  const dateMatch = block.match(
    /<time[^>]*datetime=['"]([^'"]+)['"][^>]*>([^<]*)<\/time>/i,
  );
  const repliesMatch = stripHtml(block).match(/(\d+)\s+respostas/i);
  const timestampMatch = fullBlock.match(/data-timestamp=['"](\d+)['"]/i);
  const contentTypeMatch = block.match(
    /data-ipsTooltip[^>]*title=['"]([^'"]+)['"]/i,
  );

  return {
    title: decodeHtmlEntities(stripHtml(linkMatch[2])),
    url: decodeHtmlEntities(linkMatch[1]),
    author,
    forum,
    forumId,
    excerpt,
    date: dateMatch?.[1],
    dateLabel: dateMatch?.[2] ? stripHtml(dateMatch[2]) : undefined,
    replies: repliesMatch ? Number(repliesMatch[1]) : undefined,
    contentType: contentTypeMatch?.[1],
    timestamp: timestampMatch ? Number(timestampMatch[1]) : undefined,
  };
}

function extractFirstProfileName(html: string): string | undefined {
  const match = html.match(
    /<a[^>]*href=['"][^'"]*\/profile\/[^'"]*['"][^>]*>([^<]+)<\/a>/i,
  );
  return match ? decodeHtmlEntities(stripHtml(match[1])) : undefined;
}

function extractForumName(html: string): string | undefined {
  const match = html.match(
    /<a[^>]*href=['"][^'"]*\/forum\/[^'"]*['"][^>]*>([^<]+)<\/a>/i,
  );
  return match ? decodeHtmlEntities(stripHtml(match[1])) : undefined;
}

function extractForumId(html: string): number | undefined {
  const match = html.match(/\/forum\/(\d+)-/i);
  return match ? Number(match[1]) : undefined;
}

function extractExcerpt(block: string): string | undefined {
  const match = block.match(
    /<div[^>]*data-searchable[^>]*data-findTerm[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (!match) {
    return undefined;
  }

  return decodeHtmlEntities(stripHtml(match[1])).replace(/\s+/g, " ").trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}
