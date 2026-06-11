import { describe, expect, it } from "vitest";
import { parseNotificationsHtml } from "../src/comunidade/notifications.js";

const SAMPLE = `
<li class='ipsDataItem ipsDataItem_unread'>
  <a href='https://comunidade.auvp.com.br/topic/1-test/'>Novo comentário</a>
  <a href='https://comunidade.auvp.com.br/profile/2-maria/' title='Vá para o perfil de Maria'>Maria</a>
  <time datetime='2026-06-11T10:00:00Z'>Hoje</time>
  <span class='ipsType_light'>comentou no seu tópico</span>
</li>
`;

describe("comunidadeNotifications", () => {
  it("parses notification items from HTML", () => {
    const items = parseNotificationsHtml(SAMPLE);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Novo comentário",
      author: "Maria",
      isUnread: true,
      date: "2026-06-11T10:00:00Z",
    });
  });
});
