import type { AuvpFinancasClient } from "../core/http-client.js";
import { COMUNIDADE_ORIGIN } from "./cookies.js";
import {
  getComunidadeForumById,
  resolveComunidadeForumIds,
} from "./forums.js";
import {
  decodeHtmlEntities,
  normalizeComunidadeUrl,
  stripHtml,
} from "./html-utils.js";

export interface ComunidadeForumTopicItem {
  topicId: number;
  title: string;
  url: string;
  author?: string;
  authorUrl?: string;
  replies?: number;
  lastActivity?: string;
  lastActivityLabel?: string;
}

export interface ComunidadeForumTopicsResult {
  forumId: number;
  forumName?: string;
  page: number;
  topics: ComunidadeForumTopicItem[];
}

export interface ComunidadeListForumTopicsOptions {
  forum: string | number;
  page?: number;
}

export async function listComunidadeForumTopics(
  client: AuvpFinancasClient,
  options: ComunidadeListForumTopicsOptions,
): Promise<ComunidadeForumTopicsResult> {
  const [forumId] = resolveComunidadeForumIds([options.forum]);
  const page = options.page ?? 1;

  const query: Record<string, string | number> = { forumId };
  if (page > 1) {
    query.page = page;
  }

  const html = await client.getComunidadeText("/", query);

  return {
    forumId,
    forumName: getComunidadeForumById(forumId)?.name,
    page,
    topics: parseForumTopicsHtml(html),
  };
}

export function parseForumTopicsHtml(html: string): ComunidadeForumTopicItem[] {
  const topics: ComunidadeForumTopicItem[] = [];
  const seen = new Set<number>();
  const blocks = html.split(/<li[^>]*class=["'][^"']*ipsDataItem[^"']*["'][^>]*>/i);

  for (const block of blocks.slice(1)) {
    const chunk = block.split(/<\/li>/i)[0] ?? "";
    const linkMatch = chunk.match(
      /href=["']([^"']*\/topic\/(\d+)-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!linkMatch) {
      continue;
    }

    const topicId = Number(linkMatch[2]);
    if (!Number.isFinite(topicId) || seen.has(topicId)) {
      continue;
    }
    seen.add(topicId);

    const title = decodeHtmlEntities(stripHtml(linkMatch[3]));
    if (!title || title.length < 3) {
      continue;
    }

    const authorMatch = chunk.match(
      /<a[^>]*href=["'][^"']*\/profile\/[^"']*["'][^>]*>([^<]+)<\/a>/i,
    );
    const authorUrlMatch = chunk.match(
      /<a[^>]*href=["']([^"']*\/profile\/[^"']+)["'][^>]*>/i,
    );
    const timeMatch = chunk.match(
      /<time[^>]*datetime=["']([^"']+)["'][^>]*>([^<]*)<\/time>/i,
    );
    const repliesMatch = stripHtml(chunk).match(/(\d+)\s+respostas/i);

    topics.push({
      topicId,
      title,
      url: normalizeComunidadeUrl(linkMatch[1], COMUNIDADE_ORIGIN),
      author: authorMatch
        ? decodeHtmlEntities(stripHtml(authorMatch[1]))
        : undefined,
      authorUrl: authorUrlMatch?.[1],
      replies: repliesMatch ? Number(repliesMatch[1]) : undefined,
      lastActivity: timeMatch?.[1],
      lastActivityLabel: timeMatch?.[2]
        ? stripHtml(timeMatch[2])
        : undefined,
    });
  }

  return topics;
}
