import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModalStatusStore } from "../src/react";

describe("createModalStatusStore", () => {
  const listeners = new Set<() => void>();
  let visibilityState: DocumentVisibilityState = "visible";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "setInterval",
      vi.fn((handler: () => void) => {
        listeners.add(handler);
        return 1;
      }),
    );
    vi.stubGlobal("clearInterval", vi.fn());
    vi.stubGlobal("document", {
      get visibilityState() {
        return visibilityState;
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    listeners.clear();
    visibilityState = "visible";
  });

  it("fetches status and exposes snapshot state", async () => {
    const payload = {
      services: [
        {
          id: "demo",
          label: "Demo",
          appName: "demo",
          className: "Demo",
          method: "web",
          state: "warm" as const,
          runners: 1,
          backlog: 0,
          runningInputs: 0,
          inputHeadroom: 1,
        },
      ],
      checkedAt: "2026-07-07T12:00:00.000Z",
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);

    const store = createModalStatusStore({ statusUrl: "/api/status" });
    await store.refresh({ initial: true });

    expect(fetch).toHaveBeenCalledWith("/api/status", { cache: "no-store" });
    expect(store.getSnapshot()).toEqual({
      snapshot: payload,
      error: false,
      loading: false,
      refreshing: false,
    });
  });

  it("marks error when fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
    } as Response);

    const store = createModalStatusStore();
    await store.refresh({ initial: true });

    expect(store.getSnapshot()).toMatchObject({
      snapshot: null,
      error: true,
      loading: false,
      refreshing: false,
    });
  });

  it("dedupes concurrent refresh calls", async () => {
    let resolveJson: (value: unknown) => void = () => {};
    const jsonPromise = new Promise((resolve) => {
      resolveJson = resolve;
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => jsonPromise,
    } as Response);

    const store = createModalStatusStore();
    const first = store.refresh({ initial: true });
    const second = store.refresh();

    resolveJson({
      services: [],
      checkedAt: "2026-07-07T12:00:00.000Z",
    });

    await Promise.all([first, second]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("starts polling on first subscriber and stops on unsubscribe", () => {
    const store = createModalStatusStore({ pollMs: 1_000 });
    const unsubscribe = store.subscribe(() => {});

    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1_000);
    expect(document.addEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );

    unsubscribe();
    expect(clearInterval).toHaveBeenCalled();
    expect(document.removeEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });
});
