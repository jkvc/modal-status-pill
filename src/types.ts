export type ModalPoolState = "warm" | "cold" | "warming";

export interface ModalServiceStatus {
  id: string;
  label: string;
  appName: string;
  className: string;
  method: string;
  state: ModalPoolState;
  runners: number;
  backlog: number;
  runningInputs: number;
  inputHeadroom: number;
}

export interface ModalStatusSnapshot {
  services: ModalServiceStatus[];
  checkedAt: string;
}

export const MODAL_STATUS_POLL_MS = 5_000;

export interface ModalPoolStats {
  numTotalRunners: number;
  backlog: number;
  numRunningInputs: number;
  inputHeadroom: number;
}

/**
 * Tunable comparisons for derivePoolState. Defaults preserve the opinionated
 * cold / warming / warm model for Modal GPU pool deploys.
 */
export interface ModalPoolStateThresholds {
  /** Scaled to zero: backlog strictly above this => warming. */
  coldBacklogWarmingAbove: number;
  /** Runners exist: backlog strictly above this => warming. */
  runnerBacklogWarmingAbove: number;
  /** Runners exist: running inputs strictly above this => warm. */
  warmRunningInputsAbove: number;
  /** Runners exist: input headroom strictly above this => warm. */
  warmHeadroomAbove: number;
}

export const DEFAULT_POOL_STATE_THRESHOLDS: ModalPoolStateThresholds = {
  coldBacklogWarmingAbove: 0,
  runnerBacklogWarmingAbove: 0,
  warmRunningInputsAbove: 0,
  warmHeadroomAbove: 0,
};

/**
 * Modal has no explicit "warming" flag. Runners can be >0 while @modal.enter()
 * is still loading weights — use headroom/running-inputs to distinguish that
 * from idle-warm. Queued backlog also means warming.
 */
export function derivePoolState(
  stats: ModalPoolStats,
  thresholds: ModalPoolStateThresholds = DEFAULT_POOL_STATE_THRESHOLDS,
): ModalPoolState {
  const runners = stats.numTotalRunners;
  const backlog = stats.backlog;
  const runningInputs = stats.numRunningInputs;
  const headroom = stats.inputHeadroom;

  if (runners === 0) {
    return backlog > thresholds.coldBacklogWarmingAbove ? "warming" : "cold";
  }

  if (backlog > thresholds.runnerBacklogWarmingAbove) return "warming";
  if (
    runningInputs > thresholds.warmRunningInputsAbove ||
    headroom > thresholds.warmHeadroomAbove
  ) {
    return "warm";
  }
  return "warming";
}

export function poolStateLabel(state: ModalPoolState): string {
  if (state === "warming") return "warming up";
  return state;
}

export function modalAppLabel(appName: string): string {
  return appName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export interface ModalServiceConfig {
  id: string;
  label?: string;
  appName: string;
  className: string;
  method?: string;
}

export function serviceLabel(config: ModalServiceConfig): string {
  return config.label ?? modalAppLabel(config.appName);
}
