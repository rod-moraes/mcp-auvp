import type { AuvpFinancasClient } from "../core/http-client.js";
import { decodeHtmlEntities, stripHtml } from "./html-utils.js";

export interface ComunidadeNotificationItem {
  title: string;
  url?: string;
  author?: string;
  authorUrl?: string;
  excerpt?: string;
  date?: string;
  dateLabel?: string;
  isUnread: boolean;
}

export interface ComunidadeNotificationsResult {
  total: number;
  notifications: ComunidadeNotificationItem[];
}

interface ComunidadeNotificationsApiResponse {
  data?: string;
}

export async function listComunidadeNotifications(
  client: AuvpFinancasClient,
): Promise<ComunidadeNotificationsResult> {
  const response = (await client.getComunidade(
    "/notifications/",
  )) as ComunidadeNotificationsApiResponse;

  const notifications = parseNotificationsHtml(response.data ?? "");

  return {
    total: notifications.length,
    notifications,
  };
}

export function parseNotificationsHtml(html: string): ComunidadeNotificationItem[] {
  const items: ComunidadeNotificationItem[] = [];
  const opener = /<li[^>]*class=["'][^"']*ipsDataItem[^"']*["'][^>]*>/gi;
  const starts: number[] = [];

  for (const match of html.matchAll(opener)) {
    if (match.index !== undefined) {
      starts.push(match.index);
    }
  }

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end =
      index + 1 < starts.length ? starts[index + 1] : html.length;
    const fullBlock = html.slice(start, end);
    const openerMatch = fullBlock.match(/^<li[^>]*>/i);
    const isUnread = /ipsDataItem_unread/i.test(openerMatch?.[0] ?? "");
    const chunk = fullBlock
      .replace(/^<li[^>]*>/i, "")
      .split(/<\/li>/i)[0] ?? "";
    const linkMatch = chunk.match(
      /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    const authorMatch = chunk.match(
      /<a[^>]*href=["']([^"']*\/profile\/[^"']+)["'][^>]*title=["'][^"']*perfil de ([^"']+)["']/i,
    );
    const timeMatch = chunk.match(
      /<time[^>]*datetime=["']([^"']+)["'][^>]*>([^<]*)<\/time>/i,
    );
    const excerptMatch = chunk.match(
      /<span[^>]*class=["'][^"']*ipsType_light[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    );

    const title = linkMatch
      ? decodeHtmlEntities(stripHtml(linkMatch[2]))
      : stripHtml(chunk).slice(0, 120);
    if (!title) {
      continue;
    }

    items.push({
      title,
      url: linkMatch?.[1],
      author: authorMatch?.[2]
        ? decodeHtmlEntities(authorMatch[2])
        : undefined,
      authorUrl: authorMatch?.[1],
      excerpt: excerptMatch
        ? decodeHtmlEntities(stripHtml(excerptMatch[1]))
        : undefined,
      date: timeMatch?.[1],
      dateLabel: timeMatch?.[2] ? stripHtml(timeMatch[2]) : undefined,
      isUnread,
    });
  }

  return items;
}
