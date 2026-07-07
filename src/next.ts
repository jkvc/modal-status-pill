import { NextResponse } from "next/server";
import type { ModalPoolStateThresholds, ModalServiceConfig } from "./types";
import { getModalStatusSnapshot } from "./server";

export interface CreateModalStatusGETOptions {
  thresholds?: ModalPoolStateThresholds;
}

export function createModalStatusGET(
  services: ModalServiceConfig[],
  options?: CreateModalStatusGETOptions,
) {
  return async function GET() {
    try {
      const snapshot = await getModalStatusSnapshot(services, {
        thresholds: options?.thresholds,
      });
      return NextResponse.json(snapshot);
    } catch (err) {
      console.error("[modal-status-pill]", err);
      return NextResponse.json({ error: "status_unavailable" }, { status: 503 });
    }
  };
}
