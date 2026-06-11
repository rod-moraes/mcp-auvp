import { COMUNIDADE_ORIGIN } from "./cookies.js";
import type { AuvpFinancasClient } from "../core/http-client.js";

export interface ComunidadeTopicPost {
  id: number;
  author: string;
  authorUrl?: string;
  group?: string;
  isTimeAuvp: boolean;
  isModerator: boolean;
  rank?: string;
  date?: string;
  dateLabel?: string;
  content: string;
  isOriginalPost: boolean;
  url?: string;
}

export interface ComunidadeTopicResult {
  title: string;
  url: string;
  forum?: string;
  forumUrl?: string;
  replyCount: number;
  posts: ComunidadeTopicPost[];
}

export interface ComunidadeGetTopicOptions {
  url: string;
}

export async function getComunidadeTopic(
  client: AuvpFinancasClient,
  options: ComunidadeGetTopicOptions,
): Promise<ComunidadeTopicResult> {
  const path = normalizeTopicPath(options.url);
  const html = await client.getComunidadeText(path);
  return parseComunidadeTopicHtml(html, `${COMUNIDADE_ORIGIN}${path}`);
}

export function normalizeTopicPath(urlOrPath: string): string {
  const trimmed = urlOrPath.trim();
  const parsed = trimmed.includes("://")
    ? new URL(trimmed)
    : new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, COMUNIDADE_ORIGIN);

  if (parsed.origin !== COMUNIDADE_ORIGIN) {
    throw new Error(
      `URL deve ser da Comunidade AUVP (${COMUNIDADE_ORIGIN}).`,
    );
  }

  const path = parsed.pathname.endsWith("/")
    ? parsed.pathname
    : `${parsed.pathname}/`;

  if (!/^\/topic\/\d+/i.test(path)) {
    throw new Error(
      "Informe a URL de um tópico, por exemplo /topic/43093-empreender-agora-ou-esperar/.",
    );
  }

  return path;
}

export function parseComunidadeTopicHtml(
  html: string,
  topicUrl: string,
): ComunidadeTopicResult {
  const title =
    extractMetaContent(html, "og:title") ??
    extractTagText(html, "h1") ??
    "Tópico sem título";

  const forumMatch = html.match(
    /<a[^>]*href=['"][^'"]*\/forum\/(\d+)[^'"]*['"][^>]*>([^<]+)<\/a>/i,
  );

  const posts = parseTopicPosts(html, topicUrl);

  return {
    title: decodeHtmlEntities(stripHtml(title)),
    url: topicUrl,
    forum: forumMatch ? decodeHtmlEntities(stripHtml(forumMatch[2])) : undefined,
    forumUrl: forumMatch
      ? new URL(forumMatch[0].match(/href=['"]([^'"]+)['"]/i)?.[1] ?? "", COMUNIDADE_ORIGIN).toString()
      : undefined,
    replyCount: Math.max(posts.length - 1, 0),
    posts,
  };
}

export function parseTopicPosts(
  html: string,
  topicUrl: string,
): ComunidadeTopicPost[] {
  const posts: ComunidadeTopicPost[] = [];
  const articlePattern =
    /<article[^>]*id=["']elComment_(\d+)["'][^>]*>([\s\S]*?)<\/article>/gi;

  for (const match of html.matchAll(articlePattern)) {
    const id = Number(match[1]);
    const block = match[2];
    const authorMatch =
      block.match(
        /class=["'][^"']*cAuthorPane_author[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i,
      ) ??
      block.match(
        /<a[^>]*href=["'][^"']*\/profile\/[^"']*["'][^>]*>([^<]+)<\/a>/i,
      );

    let authorUrl: string | undefined;
    let author: string | undefined;
    if (authorMatch) {
      if (authorMatch.length >= 3) {
        authorUrl = decodeHtmlEntities(authorMatch[1]);
        author = decodeHtmlEntities(stripHtml(authorMatch[2]));
      } else {
        author = decodeHtmlEntities(stripHtml(authorMatch[1]));
      }
    }

    const timeMatch = block.match(
      /<time[^>]*datetime=["']([^"']+)["'][^>]*>([^<]*)<\/time>/i,
    );
    const authorMeta = extractAuthorMetadata(block);
    const content = extractPostContent(block);
    const commentUrl = `${topicUrl.replace(/\/$/, "")}/?do=findComment&comment=${id}`;

    posts.push({
      id,
      author: author ?? "Desconhecido",
      authorUrl,
      group: authorMeta.group,
      isTimeAuvp: authorMeta.isTimeAuvp,
      isModerator: authorMeta.isModerator,
      rank: authorMeta.rank,
      date: timeMatch?.[1],
      dateLabel: timeMatch?.[2] ? stripHtml(timeMatch[2]) : undefined,
      content,
      isOriginalPost: posts.length === 0,
      url: commentUrl,
    });
  }

  return posts;
}

function extractAuthorMetadata(block: string): {
  group?: string;
  isTimeAuvp: boolean;
  isModerator: boolean;
  rank?: string;
} {
  const groupMatch = block.match(
    /<li[^>]*data-role=["']group["'][^>]*>\s*([^<]+?)\s*<\/li>/i,
  );
  const group = groupMatch
    ? decodeHtmlEntities(stripHtml(groupMatch[1]))
    : undefined;
  const isModerator =
    /cAuthorPane_badge--moderator/i.test(block) ||
    /é um moderador/i.test(block);
  const rankMatch = block.match(
    /data-ipsTooltip title=["']Rank:\s*([^"']+)["']/i,
  );

  return {
    group,
    isTimeAuvp: isTimeAuvpGroup(group),
    isModerator,
    rank: rankMatch ? decodeHtmlEntities(rankMatch[1]) : undefined,
  };
}

export function isTimeAuvpGroup(group: string | undefined): boolean {
  if (!group) {
    return false;
  }

  const normalized = group.trim().toLowerCase();
  return (
    normalized === "time auvp" ||
    normalized === "time auvp (admin)" ||
    normalized === "time auvp capital" ||
    normalized === "time auvp capital suporte"
  );
}

function extractPostContent(block: string): string {
  const commentContentMatch = block.match(
    /<div[^>]*data-role=["']commentContent["'][^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<div[^>]*class=["'][^"']*cPost_actions)/i,
  );
  if (commentContentMatch) {
    return formatRichText(commentContentMatch[1]);
  }

  const wrapMatch = block.match(
    /<div[^>]*class=["'][^"']*cPost_contentWrap[^"']*["'][^>]*>([\s\S]*)/i,
  );
  const searchBlock = wrapMatch?.[1] ?? block;
  const richMatches = [
    ...searchBlock.matchAll(
      /<div[^>]*class=["'][^"']*ipsType_richText[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    ),
  ];
  const richMatch = richMatches.at(-1);

  if (!richMatch) {
    return "";
  }

  return formatRichText(richMatch[1]);
}

function formatRichText(html: string): string {
  let text = html
    .replace(/<div[^>]*class=["'][^"']*ipsQuote_citation[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<blockquote[^>]*>/gi, "\n> ")
    .replace(/<\/blockquote>/gi, "\n");

  text = stripHtml(text);
  text = decodeHtmlEntities(text);

  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractMetaContent(html: string, property: string): string | undefined {
  const match = html.match(
    new RegExp(
      `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
  );
  return match?.[1];
}

function extractTagText(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripHtml(match[1]) : undefined;
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
