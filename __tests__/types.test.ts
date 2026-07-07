import { describe, expect, it } from "vitest";
import {
  DEFAULT_POOL_STATE_THRESHOLDS,
  derivePoolState,
  modalAppLabel,
  poolStateLabel,
  serviceLabel,
} from "../src/types";

describe("derivePoolState", () => {
  it("returns cold when scaled to zero", () => {
    expect(
      derivePoolState({
        numTotalRunners: 0,
        backlog: 0,
        numRunningInputs: 0,
        inputHeadroom: 0,
      }),
    ).toBe("cold");
  });

  it("returns warming when backlog is queued with no runners", () => {
    expect(
      derivePoolState({
        numTotalRunners: 0,
        backlog: 1,
        numRunningInputs: 0,
        inputHeadroom: 0,
      }),
    ).toBe("warming");
  });

  it("returns warming when a runner exists but has no headroom yet", () => {
    expect(
      derivePoolState({
        numTotalRunners: 1,
        backlog: 0,
        numRunningInputs: 0,
        inputHeadroom: 0,
      }),
    ).toBe("warming");
  });

  it("returns warm when idle with headroom", () => {
    expect(
      derivePoolState({
        numTotalRunners: 1,
        backlog: 0,
        numRunningInputs: 0,
        inputHeadroom: 1,
      }),
    ).toBe("warm");
  });

  it("returns warm when actively running inputs", () => {
    expect(
      derivePoolState({
        numTotalRunners: 1,
        backlog: 0,
        numRunningInputs: 1,
        inputHeadroom: 0,
      }),
    ).toBe("warm");
  });

  it("returns warming when backlog is queued even if runners exist", () => {
    expect(
      derivePoolState({
        numTotalRunners: 1,
        backlog: 2,
        numRunningInputs: 1,
        inputHeadroom: 0,
      }),
    ).toBe("warming");
  });

  it("honors custom thresholds", () => {
    const thresholds = {
      ...DEFAULT_POOL_STATE_THRESHOLDS,
      warmHeadroomAbove: 2,
    };
    expect(
      derivePoolState(
        {
          numTotalRunners: 1,
          backlog: 0,
          numRunningInputs: 0,
          inputHeadroom: 1,
        },
        thresholds,
      ),
    ).toBe("warming");
    expect(
      derivePoolState(
        {
          numTotalRunners: 1,
          backlog: 0,
          numRunningInputs: 0,
          inputHeadroom: 3,
        },
        thresholds,
      ),
    ).toBe("warm");
  });
});

describe("poolStateLabel", () => {
  it("labels warming state for display", () => {
    expect(poolStateLabel("warming")).toBe("warming up");
    expect(poolStateLabel("warm")).toBe("warm");
    expect(poolStateLabel("cold")).toBe("cold");
  });
});

describe("modalAppLabel", () => {
  it("title-cases hyphenated app names", () => {
    expect(modalAppLabel("lunas-courageous-adventure")).toBe(
      "Lunas Courageous Adventure",
    );
  });
});

describe("serviceLabel", () => {
  it("prefers explicit labels", () => {
    expect(
      serviceLabel({
        id: "x",
        label: "Klein GPU",
        appName: "lunas-courageous-adventure",
        className: "LunasCourageousAdventure",
      }),
    ).toBe("Klein GPU");
  });
});
