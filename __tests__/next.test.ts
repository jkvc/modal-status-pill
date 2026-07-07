import { describe, expect, it, vi } from "vitest";
import { createModalStatusGET } from "../src/next";

vi.mock("../src/server", () => ({
  getModalStatusSnapshot: vi.fn(async () => ({
    services: [],
    checkedAt: "2026-07-07T12:00:00.000Z",
  })),
}));

describe("createModalStatusGET", () => {
  it("returns a JSON snapshot response", async () => {
    const GET = createModalStatusGET([
      {
        id: "demo",
        appName: "demo",
        className: "Demo",
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      services: [],
      checkedAt: "2026-07-07T12:00:00.000Z",
    });
  });
});
