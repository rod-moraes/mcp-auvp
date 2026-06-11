import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const fixturePath = join(import.meta.dirname, "fixtures", "topic-sample.html");
import {
  isTimeAuvpGroup,
  normalizeTopicPath,
  parseComunidadeTopicHtml,
  parseTopicPosts,
} from "../src/comunidade/topic.js";

describe("comunidadeTopic", () => {
  it("normalizes topic paths and urls", () => {
    expect(
      normalizeTopicPath(
        "https://comunidade.auvp.com.br/topic/43093-empreender-agora-ou-esperar/?do=findComment&comment=1",
      ),
    ).toBe("/topic/43093-empreender-agora-ou-esperar/");
    expect(normalizeTopicPath("/topic/43093-test/")).toBe("/topic/43093-test/");
  });

  it("parses topic posts from saved HTML", () => {
    const html = readFileSync(fixturePath, "utf8");
    const result = parseComunidadeTopicHtml(
      html,
      "https://comunidade.auvp.com.br/topic/43093-empreender-agora-ou-esperar/",
    );

    expect(result.title).toContain("Empreender agora ou esperar");
    expect(result.posts.length).toBeGreaterThan(1);
    expect(result.posts[0]?.isOriginalPost).toBe(true);
    expect(result.posts[0]?.author).toContain("Gustavo");
    expect(result.posts[0]?.content).toContain("25 anos");
    expect(result.replyCount).toBe(result.posts.length - 1);
  });

  it("extracts author group and Time AUVP flag", () => {
    const html = readFileSync(fixturePath, "utf8");
    const posts = parseTopicPosts(
      html,
      "https://comunidade.auvp.com.br/topic/43093-empreender-agora-ou-esperar/",
    );

    const eddy = posts.find((post) => post.id === 336362);
    expect(eddy?.group).toBe("Time AUVP");
    expect(eddy?.isTimeAuvp).toBe(true);
    expect(eddy?.isModerator).toBe(true);

    const gustavo = posts.find((post) => post.id === 335949);
    expect(gustavo?.group).toBe("Turma 56");
    expect(gustavo?.isTimeAuvp).toBe(false);
    expect(isTimeAuvpGroup("Time AUVP (Admin)")).toBe(true);
  });

  it("extracts readable comment content", () => {
    const html = readFileSync(fixturePath, "utf8");
    const posts = parseTopicPosts(
      html,
      "https://comunidade.auvp.com.br/topic/43093-empreender-agora-ou-esperar/",
    );

    const reply = posts.find((post) => post.id === 336362);
    expect(reply?.content.toLowerCase()).toContain("tesouro selic");
  });
});
