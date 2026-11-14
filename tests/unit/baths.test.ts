/**
 * Spec 007 FR-005: the site ships before the bath API. A 404 on the bath list means "this API has no
 * baths yet" (the home shows "em breve"); any other failure must surface, never pass as "nothing pending".
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { listAllBaths } from "@/lib/baths";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listAllBaths", () => {
  it("answers the page when the API has baths", async () => {
    const page = { items: [], page: { number: 0, size: 100, totalItems: 0, totalPages: 0 } };
    const fetchMock = vi.fn().mockResolvedValue(json(200, page));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listAllBaths("token", { status: "registered", size: 100 })).resolves.toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/v1/bath-appointments?status=registered&size=100",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("answers null when the API has no bath endpoints", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(404, { error: "not_found" })));
    await expect(listAllBaths("token")).resolves.toBeNull();
  });

  it.each([401, 403, 500, 503])("throws on %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(status, { error: "x" })));
    await expect(listAllBaths("token")).rejects.toBeInstanceOf(ApiError);
  });
});
