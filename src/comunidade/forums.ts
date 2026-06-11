export interface ComunidadeForumNode {
  id: number;
  slug: string;
  name: string;
  parentId?: number;
  parentSlug?: string;
}

export const COMUNIDADE_FORUM_NODES: readonly ComunidadeForumNode[] = [
  { id: 44, slug: "comunidade-auvp", name: "💬 Comunidade AUVP" },
  { id: 8, slug: "avisos", name: "🚨 Avisos", parentId: 44, parentSlug: "comunidade-auvp" },
  {
    id: 45,
    slug: "baguncinha",
    name: "🍺 Baguncinha (Tema livre)",
    parentId: 44,
    parentSlug: "comunidade-auvp",
  },
  {
    id: 51,
    slug: "depoimentos",
    name: "💬 Depoimentos",
    parentId: 44,
    parentSlug: "comunidade-auvp",
  },
  {
    id: 12,
    slug: "renda-variavel",
    name: "📈 Renda Variável",
    parentId: 44,
    parentSlug: "comunidade-auvp",
  },
  {
    id: 16,
    slug: "renda-fixa",
    name: "💸 Renda Fixa",
    parentId: 44,
    parentSlug: "comunidade-auvp",
  },
  {
    id: 23,
    slug: "organizacao-financeira",
    name: "📄 Organização Financeira",
    parentId: 44,
    parentSlug: "comunidade-auvp",
  },
  {
    id: 32,
    slug: "criptomoedas",
    name: "💰 Criptomoedas e De-fi",
    parentId: 44,
    parentSlug: "comunidade-auvp",
  },
  {
    id: 49,
    slug: "confessionario",
    name: "📖 Confessionário (Anônimo)",
    parentId: 44,
    parentSlug: "comunidade-auvp",
  },
  {
    id: 20,
    slug: "desafios",
    name: "🏆 Desafios",
    parentId: 44,
    parentSlug: "comunidade-auvp",
  },
  {
    id: 56,
    slug: "previdencia-privada",
    name: "💡Previdência privada",
    parentId: 44,
    parentSlug: "comunidade-auvp",
  },
  {
    id: 55,
    slug: "network",
    name: "🤵 Relações profissionais (Network)",
    parentId: 44,
    parentSlug: "comunidade-auvp",
  },
  {
    id: 67,
    slug: "carreira-empreendedorismo",
    name: "💰 Carreira & Empreendedorismo (Conselho sinceros)",
    parentId: 44,
    parentSlug: "comunidade-auvp",
  },
  {
    id: 1,
    slug: "exclusivo-alunos",
    name: "👁️ AUVP - (Exclusivo para alunos)",
  },
  {
    id: 42,
    slug: "debates-aulas",
    name: "🤓 Debates e resumos de aulas",
    parentId: 1,
    parentSlug: "exclusivo-alunos",
  },
  {
    id: 41,
    slug: "sugestoes-reclamacoes",
    name: "⛑️ Sugestões & Reclamações",
    parentId: 1,
    parentSlug: "exclusivo-alunos",
  },
  {
    id: 22,
    slug: "precisa-de-ajuda",
    name: "❓ Precisa de ajuda (Plataforma ou curso)",
    parentId: 1,
    parentSlug: "exclusivo-alunos",
  },
  { id: 59, slug: "devs", name: "💻 Dev's" },
  { id: 63, slug: "devs-geral", name: "🍺 Geral", parentId: 59, parentSlug: "devs" },
  {
    id: 60,
    slug: "devs-duvidas",
    name: "🤔 Dúvidas técnicas",
    parentId: 59,
    parentSlug: "devs",
  },
  { id: 61, slug: "devs-projetos", name: "🛠️ Projetos", parentId: 59, parentSlug: "devs" },
  { id: 62, slug: "devs-carreira", name: "🧑‍💻 Carreira", parentId: 59, parentSlug: "devs" },
  { id: 64, slug: "auvp-agro", name: "🌾 AUVP Agro" },
  { id: 65, slug: "agro-avisos", name: "🚨 Avisos", parentId: 64, parentSlug: "auvp-agro" },
  { id: 66, slug: "agro-geral", name: "🌾 Geral", parentId: 64, parentSlug: "auvp-agro" },
] as const;

const forumById = new Map(
  COMUNIDADE_FORUM_NODES.map((forum) => [forum.id, forum]),
);
const forumBySlug = new Map(
  COMUNIDADE_FORUM_NODES.map((forum) => [forum.slug, forum]),
);

export function listComunidadeForums(): ComunidadeForumNode[] {
  return [...COMUNIDADE_FORUM_NODES];
}

export function resolveComunidadeForumIds(
  forums: readonly (string | number)[],
): number[] {
  const ids: number[] = [];

  for (const forum of forums) {
    if (typeof forum === "number" && Number.isInteger(forum) && forum > 0) {
      ids.push(forum);
      continue;
    }

    const raw = String(forum).trim();
    if (/^\d+$/.test(raw)) {
      ids.push(Number(raw));
      continue;
    }

    const normalizedSlug = raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const bySlug = forumBySlug.get(normalizedSlug);
    if (bySlug) {
      ids.push(bySlug.id);
      continue;
    }

    const byName = COMUNIDADE_FORUM_NODES.find((node) =>
      node.name.toLowerCase().includes(raw.toLowerCase()),
    );
    if (byName) {
      ids.push(byName.id);
      continue;
    }

    throw new Error(
      `Fórum desconhecido: "${forum}". Use auvp_comunidade_list_forums para ver ids e slugs.`,
    );
  }

  return [...new Set(ids)];
}

export function getComunidadeForumById(id: number): ComunidadeForumNode | undefined {
  return forumById.get(id);
}
