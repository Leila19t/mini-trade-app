# Mini Trade

A small trading app built as a take-home for Sarwa: a live stock list, a stock detail page with a Simple and a Pro (candlestick) chart, and a watchlist. The backend is a mock that behaves like a real one: a real WebSocket, latency, dropped connections and occasional errors.

**Live:** https://mini-trade.onrender.com · **API docs:** https://mini-trade.onrender.com/docs · **Design:** [Figma (architecture, wireframes, UX notes)](https://www.figma.com/design/6mPsu4srMqn4lcf04MasLG/) · **How I used AI:** [docs/ai-workflow.pdf](docs/ai-workflow.pdf)

> **Before you click around:** prices are simulated (real tickers, fake prices), and the server misbehaves *on purpose* to show how the app copes: responses take 80–450 ms, about 2% of requests fail, and every WebSocket connection drops once within its first two minutes (you'll see "Reconnecting" for a moment). There's no sign-in, so everyone shares one demo watchlist, and it resets when the server restarts.

## Features

- **Markets list:** 20 stocks with live prices over WebSocket, a 24h sparkline, search (`/` focuses it), sort, and All / Watchlist tabs. Rows flash green or red on each tick.
- **Watchlist:** star or unstar anywhere; updates are optimistic and roll back with a toast if the server says no. Unstarring offers Undo.
- **Stock detail:** live price and 24h change, rolling 24h stats, and the chart.
  - **Simple chart** (all screens): area chart over 1D–5Y, crosshair and tooltip, arrow keys, drag to scrub on touch.
  - **Pro chart** (desktop): candlesticks and volume over 1m–1D candles. The last candle is live, with a countdown to its close. OHLCV legend, crosshair, drag through 300 candles of history, zoom (wheel, pinch, − + buttons or keys, `0` resets), and fullscreen (`F`). `P` switches Simple / Pro.
- **Every state is designed:** loading skeletons, empty states, errors contained to the part that failed, a reconnecting banner with stale prices dimmed, and a "Wrong symbol" page for `/stocks/<anything>`.
- **Everything is in the URL** (search, tab, sort, range, chart mode, interval), so views are shareable and survive a refresh.
- **Light and dark themes**, following the OS until you choose. Keyboard reachable, never colour-only (+/− signs), and motion respects `prefers-reduced-motion`.

## Run it locally

Needs **Node.js 24** and **pnpm** (the version is pinned in `package.json`; `corepack enable` or `npm install -g pnpm`).

```bash
pnpm install
pnpm dev          # web app on http://localhost:5173, mock server on :4000 (proxied)
```

```bash
pnpm test         # all tests (server + web)
pnpm typecheck    # every package
pnpm lint
pnpm build        # production build of the web app
pnpm start        # production: the mock server also serves the built app on :4000
```

Mock server settings (environment variables):

| Variable | Default | What it does |
|---|---|---|
| `CHAOS` | on | `CHAOS=off` turns off latency, errors and socket drops |
| `ERROR_RATE` | `0.02` | Share of API requests that fail with 503 (0–1), e.g. `ERROR_RATE=0.3` to see the error states |
| `SEED` | `42` | Same seed, same market |
| `PORT` | `4000` | Server port |

## Project structure

```
apps/web/            React + TypeScript + Vite client
apps/mock-server/    Node mock backend: price engine, REST API, WebSocket
packages/contracts/  zod schemas + types shared by both apps (the API contract)
docs/                openapi.json (generated), ai-workflow.md / .pdf
```

## Architecture

```
            packages/contracts  (zod schemas: every HTTP response and socket message)
                 │ imported by both
     ┌───────────┴────────────┐
apps/mock-server              apps/web
  price engine ──► REST /api ───── HTTP ────► request() ──► TanStack Query (server state)
       └─────────► WebSocket /ws ── WS ─────► PriceSocket ─► Redux (live prices, connection)
  watchlist store                                              └──► hooks ──► screens / views / components
```

- **Contracts first.** Every response and socket message has a zod schema in `packages/contracts`. The server is typed against them, the client validates everything it receives with them, and the OpenAPI docs are generated from them (a test fails if `docs/openapi.json` is stale). Client and server can't drift apart.
- **Two kinds of state.** TanStack Query holds what comes over HTTP (stocks, history per range, candles per interval, watchlist): caching, retries of 503s, optimistic watchlist changes. Redux holds what changes many times a second (live prices by symbol, connection status), with per-symbol selectors so one tick re-renders one row.
- **The socket client is plain TypeScript** (`data/PriceSocket.ts`): reconnects with exponential backoff and jitter, a heartbeat timeout that catches silent stalls, and ref-counted, batched subscriptions restored after every reconnect.
- **One price engine** (geometric Brownian motion, seeded) makes the history, the candles and the live ticks, so every chart ends exactly at the live price and the ranges agree with each other. Everything lives in memory; live prices are kept per minute for a week, then per hour.
- **One origin in production.** The Node server serves the built app, the API and the WebSocket, so there's no CORS and no separate socket URL.

The full diagram is in Figma, along with every screen and its UX notes.

## Key decisions

- **Web, not React Native.** The role values React Native, but I'm much stronger on web, and a polished web app is a better showing than a rough first native one.
- **No sign-in.** It added setup friction for reviewers (OAuth credentials) without showing much frontend skill; I spent that time on the Pro chart instead. The watchlist store keeps the same interface a database-backed one would.
- **A mock that misbehaves.** Latency, 503s and two kinds of socket drop (an abrupt close, and a silent stall only a heartbeat can detect) exist so the loading, retry, rollback and reconnect states are real, not just designed.
- **The mock market trades 24/7,** so "today" is a rolling 24 hours: stats are 24h high / low / volume and the change is from 24 hours ago, instead of an exchange's open and close.
- **Simple chart hand-written in SVG; Pro chart on Lightweight Charts** (TradingView, Apache-2.0; its logo on the chart is the attribution the licence asks for). The Pro chart is lazy-loaded, so phones and Simple-only visitors never download it.
- **Candles come from the server,** built from the same price path as the line chart (seeded Brownian bridges fill in the wicks), start on clock boundaries like a real exchange, and are refetched right after the live candle closes. Live ticks move the last candle in between.
- **Prices are plain numbers in USD,** rounded to cents. A system that moves money would use integer minor units or decimal strings.

## Testing

192 tests with Vitest: 126 on the server, 66 in the web app.

- **Server:** the price engine and candles (determinism, charts agreeing with the live price, memory bounds), every endpoint and socket message against the contracts on a real server, the simulated failures, and the OpenAPI file being up to date. Tests run on a seeded engine with an injected clock and chaos off.
- **Web** (jsdom + React Testing Library): the socket client (reconnect, heartbeat, subscriptions, with fake timers), optimistic watchlist toggles, the chart helpers, and the Pro chart components (Lightweight Charts is mocked, since jsdom can't draw on a canvas).

## Deployment

- **CI:** GitHub Actions runs install, typecheck, lint, tests and the build on every push and pull request (`.github/workflows/ci.yml`).
- **Hosting:** one Render web service (`render.yaml`) on Node 24. It deploys a commit to `main` only after CI passes, and uses `/health` as its health check.

## What I'd do next

- **Error boundary** around each screen, and a Playwright test of the main path (list → detail → star).
- **Price alerts** (designed in Figma): % move limits checked on the server and pushed over the socket.
- **Sign-in and a database** behind the existing watchlist interface.
- **The rest of the motion spec:** digit roll on price changes, a sliding tab underline, rows collapsing on unstar.
- **One TypeScript version** across the repo (the root is on 7, the web app on 6).
