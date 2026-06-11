import { describe, expect, it } from "vitest";
import {
  extractCsrfKey,
  extractResultCount,
  parseComunidadeSearchHtml,
} from "../src/comunidade/search.js";
import { resolveComunidadeForumIds } from "../src/comunidade/forums.js";

const sampleItem = `
<li class='ipsStreamItem' data-role='activityItem' data-timestamp='1779213987'>
  <div class='ipsStreamItem_header'>
    <span data-ipsTooltip title='Post'><i class='fa fa-comment'></i></span>
    <h2 class='ipsStreamItem_title'>
      <a href='https://comunidade.auvp.com.br/topic/43093-teste/?do=findComment&amp;comment=336362' data-searchable> Empreender agora ou esperar?</a>
    </h2>
    <p class='ipsStreamItem_status'>
      <a href='https://comunidade.auvp.com.br/profile/20109-eddy-paulini/'>Eddy Paulini</a>
      respondeu em <a href='https://comunidade.auvp.com.br/forum/67-carreira/'>💰 Carreira</a>
    </p>
  </div>
  <div class='ipsStreamItem_snippet'>
    <div data-searchable data-findTerm>
      Dá pra utilizar de <strong>renda fixa</strong>, tranquilo!
    </div>
  </div>
  <ul class='ipsStreamItem_meta'>
    <li><time datetime='2026-05-19T18:06:27Z'>19 de Maio</time></li>
    <li><a href='#'><i class='fa fa-comment'></i> 14 respostas</a></li>
  </ul>
</li>
`;

describe("comunidadeSearch", () => {
  it("parses search result items from HTML", () => {
    const html = `
      <p class='ipsType_sectionTitle'>Encontrou 1 resultados</p>
      <ol data-role='resultsContents'>${sampleItem}</ol>
    `;

    const results = parseComunidadeSearchHtml(html);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: "Empreender agora ou esperar?",
      url: "https://comunidade.auvp.com.br/topic/43093-teste/?do=findComment&comment=336362",
      author: "Eddy Paulini",
      forum: "💰 Carreira",
      forumId: 67,
      replies: 14,
      date: "2026-05-19T18:06:27Z",
      timestamp: 1779213987,
    });
    expect(results[0]?.excerpt).toContain("renda fixa");
  });

  it("extracts result count and csrf key", () => {
    expect(
      extractResultCount("<p>Encontrou 4 resultados</p>"),
    ).toBe(4);
    expect(
      extractCsrfKey('<input type="hidden" name="csrfKey" value="abc123">'),
    ).toBe("abc123");
  });

  it("resolves forum ids and slugs", () => {
    expect(resolveComunidadeForumIds(["renda-fixa", 32])).toEqual([16, 32]);
    expect(() => resolveComunidadeForumIds(["inexistente"])).toThrow(
      /Fórum desconhecido/,
    );
  });
});
