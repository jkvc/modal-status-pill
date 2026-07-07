import { useSyncExternalStore } from "react";
import type { ModalServiceStatus, ModalStatusSnapshot } from "./types";
import { MODAL_STATUS_POLL_MS } from "./types";

export interface ModalStatusStoreState {
  snapshot: ModalStatusSnapshot | null;
  error: boolean;
  loading: boolean;
  refreshing: boolean;
}

export interface ModalStatusStoreOptions {
  statusUrl?: string;
  pollMs?: number;
}

export interface ModalStatusStore {
  getSnapshot: () => ModalStatusStoreState;
  subscribe: (listener: () => void) => () => void;
  refresh: (options?: { initial?: boolean }) => Promise<void>;
}

export function createModalStatusStore(
  options: ModalStatusStoreOptions = {},
): ModalStatusStore {
  const statusUrl = options.statusUrl ?? "/api/status";
  const pollMs = options.pollMs ?? MODAL_STATUS_POLL_MS;

  const initialState: ModalStatusStoreState = {
    snapshot: null,
    error: false,
    loading: false,
    refreshing: false,
  };

  let state = initialState;
  let subscriberCount = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let inFlight: Promise<void> | null = null;
  let visibilityHandler: (() => void) | null = null;
  const listeners = new Set<() => void>();

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  function setState(patch: Partial<ModalStatusStoreState>) {
    state = { ...state, ...patch };
    emit();
  }

  async function refresh(refreshOptions?: { initial?: boolean }): Promise<void> {
    if (inFlight) {
      await inFlight;
      return;
    }

    if (refreshOptions?.initial) {
      setState({ loading: true });
    } else {
      setState({ refreshing: true });
    }

    inFlight = (async () => {
      try {
        const res = await fetch(statusUrl, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("status unavailable");
        }
        const data = (await res.json()) as ModalStatusSnapshot;
        setState({
          snapshot: data,
          error: false,
          loading: false,
          refreshing: false,
        });
      } catch {
        setState({
          error: true,
          loading: false,
          refreshing: false,
        });
      } finally {
        inFlight = null;
      }
    })();

    await inFlight;
  }

  function startPolling() {
    void refresh({ initial: true });

    intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, pollMs);

    visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    subscriberCount += 1;

    if (subscriberCount === 1) {
      startPolling();
    }

    return () => {
      listeners.delete(listener);
      subscriberCount -= 1;
      if (subscriberCount === 0) {
        stopPolling();
      }
    };
  }

  return {
    getSnapshot: () => state,
    subscribe,
    refresh,
  };
}

const defaultStore = createModalStatusStore();

export function getModalStatusStoreSnapshot(): ModalStatusStoreState {
  return defaultStore.getSnapshot();
}

export function subscribeModalStatus(listener: () => void): () => void {
  return defaultStore.subscribe(listener);
}

export async function refreshModalStatus(options?: {
  initial?: boolean;
}): Promise<void> {
  return defaultStore.refresh(options);
}

export function useModalStatus(serviceId?: string) {
  const { snapshot, error, loading, refreshing } = useSyncExternalStore(
    subscribeModalStatus,
    getModalStatusStoreSnapshot,
    getModalStatusStoreSnapshot,
  );

  const service: ModalServiceStatus | null = serviceId
    ? (snapshot?.services.find((entry) => entry.id === serviceId) ?? null)
    : (snapshot?.services[0] ?? null);

  return {
    service,
    snapshot,
    error,
    loading,
    refreshing,
    refresh: refreshModalStatus,
  };
}
