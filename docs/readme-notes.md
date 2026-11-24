# README notes (scratch)

Points to fold into the final README. Delete this file before submitting.

## How to run (draft)

- Node.js LTS (24 or 26).
- pnpm: `npm install -g pnpm` (Corepack isn't bundled with Node.js 25+). The version is pinned in `packageManager`.
- `pnpm install`, then `pnpm dev`, which starts the web app and the mock server together.
- `pnpm typecheck` checks every package. `pnpm test` runs all tests.

## Decisions

**Stack**
- React + TypeScript + Vite rather than React Native: plays to my strengths and lets reviewers run it with one command.
- Redux Toolkit for client state (live prices keyed by symbol, connection status); TanStack Query for server state (stocks, history per range, watchlist).

**Monorepo**
- pnpm workspaces: `apps/web`, `apps/mock-server`, `packages/contracts`.
- `packages/contracts` holds zod schemas for every socket message and API response. Both apps import them, so client and server can't drift apart. Renaming a field breaks typecheck in both apps at once.
- Contracts have no build step: `exports` points at the `.ts` source, which Vite and `tsx` compile.
- The server runs with `tsx`, not Node's built-in type stripping, because Node won't strip types from files under `node_modules`, which is where pnpm links workspace packages.
- Rules: each package declares its own dependencies; shared dev tooling lives at the root; apps import packages, never the other way round.
- One TypeScript version across the repo (to finalize).

**Security / supply chain**
- pnpm blocks dependency install scripts by default. Only `esbuild` is allowed (needed by `tsx`), recorded in `pnpm-workspace.yaml`.

**Mock backend that behaves like the real thing**
- Seeded geometric Brownian motion price engine with per-stock volatility. The same engine generates history and live ticks, so the chart and the live price always agree.
- Real WebSocket (ticks, subscribe/unsubscribe, heartbeat) plus REST (stocks, history by range, watchlist).
- Simulated latency, random socket drops and occasional request errors, to exercise the loading, reconnect and rollback states.
- Real tickers, simulated prices, labelled "Simulated data" in the UI.

**UX**
- Optimistic star/unstar, with rollback and a toast on failure; Undo toast instead of a confirm dialog.
- Socket drops: prices stay visible but dimmed, with a banner showing staleness and a reconnect countdown.
- Price flash on tick, disabled with `prefers-reduced-motion`. Change always shows a +/− sign, not just colour.
- Chart range is in the URL (`?range=1M`): shareable, survives refresh. Ranges are cached.
- Skeleton loading in the real layout; errors are contained to the part of the page that failed.

## Links to add
- Figma: architecture diagram + wireframes.
- `docs/ai-workflow.md`.
