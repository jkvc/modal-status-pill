import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertModalWorkspaceTokens,
  fetchModalPoolStats,
  getModalServiceStatus,
  getModalStatusSnapshot,
} from "../src/server";

const SERVICE = {
  id: "demo-app",
  appName: "demo-app",
  className: "DemoCls",
  method: "web",
} as const;

function createModalMock(stats: {
  numTotalTasks?: number;
  backlog?: number;
  numRunningInputs?: number;
  inputHeadroom?: number;
}) {
  const webFn = { functionId: "fn-demo-web" };
  const instance = {
    method: vi.fn(() => webFn),
  };
  const cls = {
    instance: vi.fn(async () => instance),
  };

  return {
    cls: {
      fromName: vi.fn(async () => cls),
    },
    cpClient: {
      functionGetCurrentStats: vi.fn(async () => ({
        numTotalTasks: stats.numTotalTasks ?? 0,
        backlog: stats.backlog ?? 0,
        numRunningInputs: stats.numRunningInputs ?? 0,
        inputHeadroom: stats.inputHeadroom ?? 0,
      })),
    },
  };
}

describe("assertModalWorkspaceTokens", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("throws when tokens are missing", () => {
    delete process.env.MODAL_TOKEN_ID;
    delete process.env.MODAL_TOKEN_SECRET;
    expect(() => assertModalWorkspaceTokens()).toThrow(
      "Modal workspace tokens are not configured",
    );
  });

  it("passes when tokens are set", () => {
    process.env.MODAL_TOKEN_ID = "id";
    process.env.MODAL_TOKEN_SECRET = "secret";
    expect(() => assertModalWorkspaceTokens()).not.toThrow();
  });
});

describe("fetchModalPoolStats", () => {
  it("reads raw stats from cpClient", async () => {
    const modal = createModalMock({
      numTotalTasks: 2,
      backlog: 1,
      numRunningInputs: 3,
      inputHeadroom: 4,
    });

    const stats = await fetchModalPoolStats(modal as never, SERVICE);

    expect(modal.cls.fromName).toHaveBeenCalledWith("demo-app", "DemoCls");
    expect(modal.cpClient.functionGetCurrentStats).toHaveBeenCalledWith(
      { functionId: "fn-demo-web" },
      { timeoutMs: 10_000 },
    );
    expect(stats).toEqual({
      numTotalRunners: 2,
      backlog: 1,
      numRunningInputs: 3,
      inputHeadroom: 4,
    });
  });
});

describe("getModalServiceStatus", () => {
  it("maps stats into a service status snapshot row", async () => {
    const modal = createModalMock({
      numTotalTasks: 1,
      backlog: 0,
      numRunningInputs: 0,
      inputHeadroom: 1,
    });

    const status = await getModalServiceStatus(modal as never, SERVICE);

    expect(status).toMatchObject({
      id: "demo-app",
      label: "Demo App",
      appName: "demo-app",
      className: "DemoCls",
      method: "web",
      state: "warm",
      runners: 1,
      backlog: 0,
      runningInputs: 0,
      inputHeadroom: 1,
    });
  });
});

describe("getModalStatusSnapshot", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.MODAL_TOKEN_ID = "id";
    process.env.MODAL_TOKEN_SECRET = "secret";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-07T12:00:00.000Z"));
  });

  afterEach(() => {
    process.env = { ...original };
    vi.useRealTimers();
  });

  it("returns all configured services with a checkedAt timestamp", async () => {
    const modal = createModalMock({
      numTotalTasks: 0,
      backlog: 0,
      numRunningInputs: 0,
      inputHeadroom: 0,
    });

    const snapshot = await getModalStatusSnapshot([SERVICE, { ...SERVICE, id: "other" }], {
      modal: modal as never,
    });

    expect(snapshot.services).toHaveLength(2);
    expect(snapshot.checkedAt).toBe("2026-07-07T12:00:00.000Z");
    expect(snapshot.services[0]?.state).toBe("cold");
  });
});
