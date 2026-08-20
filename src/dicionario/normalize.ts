export interface SanitizedDictionaryTerm {
  id?: string;
  concept?: string;
  definition?: string;
  category?: string;
  validated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeDictionaryTerm(
  value: unknown,
): SanitizedDictionaryTerm | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const term = value as Record<string, unknown>;
  return removeUndefined({
    id: asString(term._id ?? term.id),
    concept: asString(term.concept),
    definition:
      typeof term.definition === "string"
        ? stripHtml(term.definition)
        : undefined,
    category: asString(term.categories ?? term.category),
    validated:
      typeof term.validated === "boolean" ? term.validated : undefined,
    createdAt: asString(term.createdAt),
    updatedAt: asString(term.updatedAt),
  });
}

export function sanitizeDictionarySearchResponse(value: unknown): {
  totalPages?: number;
  terms: SanitizedDictionaryTerm[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { terms: [] };
  }

  const response = value as Record<string, unknown>;
  const terms = Array.isArray(response.terms)
    ? response.terms
        .map(sanitizeDictionaryTerm)
        .filter((term): term is SanitizedDictionaryTerm => Boolean(term))
    : [];

  return {
    totalPages:
      typeof response.totalPages === "number" ? response.totalPages : undefined,
    terms,
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

