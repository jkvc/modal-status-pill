import type { ModalClient } from "modal";
import type {
  ModalPoolStateThresholds,
  ModalPoolStats,
  ModalServiceConfig,
  ModalServiceStatus,
  ModalStatusSnapshot,
} from "./types";
import {
  DEFAULT_POOL_STATE_THRESHOLDS,
  derivePoolState,
  serviceLabel,
} from "./types";

export type {
  ModalPoolState,
  ModalPoolStateThresholds,
  ModalPoolStats,
  ModalServiceConfig,
  ModalServiceStatus,
  ModalStatusSnapshot,
} from "./types";

export {
  DEFAULT_POOL_STATE_THRESHOLDS,
  MODAL_STATUS_POLL_MS,
  derivePoolState,
  modalAppLabel,
  poolStateLabel,
  serviceLabel,
} from "./types";

export function assertModalWorkspaceTokens(): void {
  const tokenId = process.env.MODAL_TOKEN_ID?.trim();
  const tokenSecret = process.env.MODAL_TOKEN_SECRET?.trim();
  if (!tokenId || !tokenSecret) {
    throw new Error("Modal workspace tokens are not configured");
  }
}

export async function fetchModalPoolStats(
  modal: ModalClient,
  config: ModalServiceConfig,
): Promise<ModalPoolStats> {
  const methodName = config.method ?? "web";
  const cls = await modal.cls.fromName(config.appName, config.className);
  const instance = await cls.instance();
  const webFn = instance.method(methodName);

  // SDK getCurrentStats() drops numRunningInputs and inputHeadroom — read raw.
  const resp = await modal.cpClient.functionGetCurrentStats(
    { functionId: webFn.functionId },
    { timeoutMs: 10_000 },
  );

  return {
    numTotalRunners: resp.numTotalTasks ?? 0,
    backlog: resp.backlog ?? 0,
    numRunningInputs: resp.numRunningInputs ?? 0,
    inputHeadroom: resp.inputHeadroom ?? 0,
  };
}

export async function getModalServiceStatus(
  modal: ModalClient,
  config: ModalServiceConfig,
  thresholds: ModalPoolStateThresholds = DEFAULT_POOL_STATE_THRESHOLDS,
): Promise<ModalServiceStatus> {
  const stats = await fetchModalPoolStats(modal, config);
  const method = config.method ?? "web";

  return {
    id: config.id,
    label: serviceLabel(config),
    appName: config.appName,
    className: config.className,
    method,
    state: derivePoolState(stats, thresholds),
    runners: stats.numTotalRunners,
    backlog: stats.backlog,
    runningInputs: stats.numRunningInputs,
    inputHeadroom: stats.inputHeadroom,
  };
}

export interface GetModalStatusSnapshotOptions {
  thresholds?: ModalPoolStateThresholds;
  modal?: ModalClient;
}

export async function getModalStatusSnapshot(
  services: ModalServiceConfig[],
  options?: GetModalStatusSnapshotOptions,
): Promise<ModalStatusSnapshot> {
  const { ModalClient: ModalClientCtor } = await import("modal");
  assertModalWorkspaceTokens();

  const modal = options?.modal ?? new ModalClientCtor();
  const thresholds = options?.thresholds ?? DEFAULT_POOL_STATE_THRESHOLDS;

  const statuses = await Promise.all(
    services.map((config) => getModalServiceStatus(modal, config, thresholds)),
  );

  return {
    services: statuses,
    checkedAt: new Date().toISOString(),
  };
}
