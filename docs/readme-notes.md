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

**Contracts (API design)**
- WebSocket at `/ws`. Client sends `subscribe` / `unsubscribe`. Server sends `welcome` (with heartbeat interval), `prices` (batched ticks), `subscribed` (ack), `heartbeat`, `error`.
- REST under `/api`: `GET /stocks`, `GET /stocks/:symbol`, `GET /stocks/:symbol/history?range=`, `GET|PUT|DELETE /watchlist[/:symbol]`. Errors always come back as `{ error: { code, message } }`.
- Prices are numbers in USD rounded to cents; a real money-moving system would use integer minor units or decimal strings.
- The list response carries a small intraday `trend` array per stock, so sparklines don't need 20 history requests.
- The mock market trades 24/7, so "today" is a rolling 24-hour window (like crypto apps): stats and change use `price24hAgo`, `high24h`, `low24h`, `volume24h`. There's no exchange session, so no separate open/close.

**Price engine**
- Geometric Brownian motion per stock (log space: prices stay positive, moves are proportional), seeded so the market is reproducible. Each stock has its own random stream derived from the seed and its symbol, so adding a stock never changes the others.
- History is generated backwards from the starting price at weekly resolution, then filled in with Brownian bridges at daily → 4-hour → hourly → 5-minute resolution. Every range passes through the same prices at shared timestamps, so 1Y and 1M can never disagree, and every chart ends exactly at the live price.
- Live ticks continue the same path. Real per-second moves are fractions of a cent, so live volatility is scaled 15× for the demo; history stays realistic. Each stock moves on ~50% of ticks so the list doesn't flash all at once.
- Live samples are kept once per minute (bounded memory) and snapped onto each range's grid.
- 29 Vitest tests with an injected clock: determinism, charts ending at the live price, agreement across resolutions, plausible moves, contract conformance for every response.

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

**Design**
- Sarwa-inspired palette (deep green #07351A, off-white, accent yellow for stars), no gradients. Brand green is for brand/actions; separate brighter up/down colours for price moves.
- Colours are Light/Dark design tokens in Figma that map 1:1 to CSS variables; dark mode uses a lighter green because #07351A disappears on dark backgrounds.
- Motion: 120–300 ms, springs for direct manipulation, View Transitions for the theme switch, everything falls back to fades with prefers-reduced-motion.

**Scope and stretch goals** (only after the core brief works end to end)
- Light/dark theme (system default + toggle).
- Google sign-in with Better Auth; prices are public, sign-in only for the watchlist. Local dev falls back to a demo user when no Google keys are set.
- Real database (Postgres via Drizzle; PGlite locally so `pnpm dev` needs no setup).
- Price alerts as % move from yesterday's close (separate up/down limits), checked on the server and pushed over the socket; occasional "news shock" jumps in the mock so alerts actually fire.
- Hosting on Render: one service (Node server also serves the built web app) + Render Postgres; same origin keeps cookies and WebSockets simple.

## Links to add
- API docs: `docs/openapi.json`, or `/docs` on the running mock server (Swagger UI, try requests live).
- Figma: architecture diagram + wireframes.
- `docs/ai-workflow.md`.
