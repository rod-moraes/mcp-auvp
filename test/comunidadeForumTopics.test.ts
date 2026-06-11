import { describe, expect, it } from "vitest";
import { parseForumTopicsHtml } from "../src/comunidade/forum-topics.js";

const SAMPLE = `
<li class='ipsDataItem'>
  <a href='https://comunidade.auvp.com.br/topic/43983-ajuda-mcp/?do=getNewComment'>Ajuda MCP</a>
  <a href='https://comunidade.auvp.com.br/profile/1-rodrigo/'>Rodrigo</a>
  <time datetime='2026-06-10T12:00:00Z'>Ontem</time>
  12 respostas
</li>
`;

describe("comunidadeForumTopics", () => {
  it("parses topic rows from forum HTML", () => {
    const topics = parseForumTopicsHtml(SAMPLE);
    expect(topics).toHaveLength(1);
    expect(topics[0]).toMatchObject({
      topicId: 43983,
      title: "Ajuda MCP",
      url: "https://comunidade.auvp.com.br/topic/43983-ajuda-mcp/",
      author: "Rodrigo",
      replies: 12,
    });
  });
});
