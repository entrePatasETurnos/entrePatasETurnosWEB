/** The administrator section navigation links to user management (spec 010, US3). */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminNav } from "@/app/admin/AdminNav";

function usersLink(current: Parameters<typeof AdminNav>[0]["current"]) {
  const html = renderToStaticMarkup(createElement(AdminNav, { current }));
  return html.match(/<a[^>]*href="\/admin\/usuarios"[^>]*>[^<]*<\/a>/)?.[0];
}

describe("AdminNav", () => {
  it("offers Usuários on every admin page, the home included", () => {
    expect(usersLink("inicio")).toContain(">Usuários</a>");
    expect(usersLink("inicio")).not.toContain("aria-current");
  });

  it("marks Usuários as the current section on the user pages", () => {
    expect(usersLink("usuarios")).toContain('aria-current="page"');
  });
});
