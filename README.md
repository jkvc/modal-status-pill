# modal-status-pill

Headless [Modal](https://modal.com) GPU pool status for Next.js apps. Poll a status route, derive **cold / warming / warm** from autoscaler stats, and render your own UI.

Modal's public `getCurrentStats()` only exposes `backlog` and `numTotalRunners`. This package reads the raw stats API so you can tell when runners exist but weights are still loading in `@modal.enter()`.

## Install

    pnpm add modal-status-pill modal

Set `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` in the environment that serves your status route.

## Quick start

### Status route

    // app/api/status/route.ts
    import { createModalStatusGET } from "modal-status-pill/next";

    export const dynamic = "force-dynamic";

    export const GET = createModalStatusGET([
      {
        id: "my-gpu-app",
        appName: "my-gpu-app",
        className: "MyGpuCls",
        method: "web",
      },
    ]);

### React hook (headless)

    "use client";

    import { useModalStatus, poolStateLabel } from "modal-status-pill/react";

    export function GpuStatusPill() {
      const { service, error, loading } = useModalStatus("my-gpu-app");

      if (loading && !service) return <span>checking…</span>;
      if (error || !service) return <span>gpu unavailable</span>;

      return <span>{poolStateLabel(service.state)}</span>;
    }

## Exports

| Import | Use |
|--------|-----|
| `modal-status-pill` | Types, `derivePoolState`, `poolStateLabel` |
| `modal-status-pill/server` | `getModalStatusSnapshot`, `fetchModalPoolStats` |
| `modal-status-pill/react` | `useModalStatus`, `createModalStatusStore` |
| `modal-status-pill/next` | `createModalStatusGET` |

## Pool state model

| State | Meaning |
|-------|---------|
| `cold` | Scaled to zero, no queued backlog |
| `warming` | Backlog queued, or runners booting / loading weights |
| `warm` | Runners up with headroom or active inputs |

Override comparisons with `ModalPoolStateThresholds` — defaults match the opinionated model above.

## License

MIT
