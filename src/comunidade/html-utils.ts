export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

export function normalizeComunidadeUrl(
  href: string,
  origin: string,
): string {
  const url = new URL(href, origin);
  const path = url.pathname.endsWith("/")
    ? url.pathname
    : `${url.pathname}/`;
  return `${origin}${path}`;
}
