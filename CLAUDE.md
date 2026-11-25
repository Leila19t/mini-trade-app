# Mini Trade

A small trading app built as a take-home: a live stock list, a stock detail page
with a historical chart (1D–5Y) and a watchlist. The backend is a mock that must
behave like a real one: real WebSocket, latency, dropped connections, occasional errors.

Treat this as code a team will keep building on. Clarity beats cleverness.

## Repo map

```
apps/web/            React + TypeScript + Vite client (@mini-trade/web)
apps/mock-server/    Node mock backend: price engine, WebSocket, REST (@mini-trade/server)
packages/contracts/  zod schemas + inferred types shared by both apps (@mini-trade/contracts)
docs/                ai-workflow.md (AI log), readme-notes.md (decisions for the README)
```

Designs (architecture diagram + wireframes with UX notes) live in Figma; ask for
the link if you need it.

## Commands (run from the repo root)

```bash
pnpm install          # install everything
pnpm dev              # web + mock server together
pnpm typecheck        # typecheck every package
pnpm test             # run every package's tests
pnpm --filter @mini-trade/web <script>      # one package
pnpm --filter <pkg> add <dep>               # add a dependency to one package
pnpm --filter <pkg> add <pkg> --workspace   # link a workspace package (workspace deps only!)
pnpm --filter @mini-trade/server openapi    # regenerate docs/openapi.json after changing contracts
```

API docs: `docs/openapi.json` (OpenAPI 3.1), served at `/api/openapi.json` with an
interactive page at `/docs` while the mock server runs.

Use pnpm only. Never run npm or yarn in this repo.

## Architecture rules

- **Contracts are the source of truth.** Every socket message and HTTP response has a
  zod schema in `packages/contracts`. Change the schema first, then both apps.
  Never redeclare these types by hand in an app.
- **Validate at the boundary.** The client `safeParse`s every socket message and every
  HTTP response; the server parses every incoming client message and query. Invalid
  data is logged and dropped; it never crashes the UI.
- **HTTP endpoints** are defined once in `contracts/src/api.ts` (`endpoints`). The server
  registers `route`; the client calls `path(...)` and parses with `response`.
- **OpenAPI is generated** from the contracts (`contracts/src/openapi.ts`), never edited by
  hand. A new endpoint needs an entry in its `docs` map (typecheck enforces it), and a
  test fails if `docs/openapi.json` is stale.
- **Imports flow one way:** apps → packages. Packages never import apps; apps never
  import each other.
- **Dependencies live where they are used.** Shared dev tooling only at the root.
  Ask before adding a new dependency.

### Web app structure (`apps/web/src`)

```
screens/       one per route: MarketsScreen (home), StockDetailScreen. Lay out views; no fetching logic
views/         large sections built from components (e.g. the watchlist, the stock table, the chart panel)
components/    small reusable pieces, grouped in folders: auth/, navigation/, more as needed
helpers/       constants.ts, utils.ts (pure, framework-free), types.ts (UI-only types)
hooks/         custom hooks (data, socket, media queries...)
assets/        images, icons, fonts
```

Also at the root of `src`: `router.tsx` (every route), `App.tsx` (root layout: header +
`<Outlet />`), `tokens.css` (design tokens), `index.css` (Tailwind setup + base styles).

- Names: `*Screen` for screens, PascalCase files for components, `useX` for hooks.
  Named exports, one component per file, no barrel `index.ts` files.
- Data flows down: screens → views → components. Components don't fetch; hooks do.
- **Routing:** React Router (`createBrowserRouter`). Routes: `/` MarketsScreen,
  `/stocks/:symbol` StockDetailScreen, `*` NotFoundScreen. Build links with `paths` from
  `helpers/constants.ts`, never hand-written strings.
- **Styling:** Tailwind CSS v4 (Vite plugin), utility classes in the JSX, no CSS files per
  component. `index.css` holds the Tailwind setup and base styles; `tokens.css` holds the
  colours, mirroring the Figma "Theme" collection 1:1. Tailwind colour classes keep the
  Figma group: `bg/surface` → `bg-bg-surface`, `text/muted` → `text-text-muted`,
  `border/strong` → `border-border-strong`, `price/up` → `text-price-up`. The default
  Tailwind palette is off, so only design-system colours exist. Dark mode is
  `<html data-theme="dark">` (tokens switch automatically; `dark:` also works).
  Page column: `mx-auto max-w-page px-6` (1120px content + 24px gutters, as in Figma).
  Figma text with "normal" line height → `leading-[normal]`. Radii: 4px `rounded-sm`,
  8px `rounded-lg`, pills `rounded-full`. Buttons need `cursor-pointer` (Tailwind's reset).
- **Icons** are exported from Figma as-is into `assets/icons/` and used as `<img alt="">`
  next to visible text or inside a labelled button.

### Client state

- **Redux Toolkit** = client state that changes often: live prices keyed by symbol,
  connection status. Use memoised per-symbol selectors so one tick re-renders one row.
- **TanStack Query** = server state: stock list, stock detail, history per
  `[symbol, range]`, watchlist. Watchlist mutations are optimistic with rollback.
- Never copy server data into Redux, or live prices into the Query cache.
- The socket client is a plain TS class outside React (reconnect with backoff,
  ref-counted subscriptions, heartbeat timeout). React talks to it through hooks.

### Mock server

- One seeded price engine (geometric Brownian motion) produces both history and live
  ticks, so the chart's last point always matches the live price.
- Ticks are batched into `prices` messages on a short interval.
- Engine code lives in `apps/mock-server/src/engine`; history is generated at several
  resolutions joined by Brownian bridges, so every chart range agrees at shared timestamps.
  Live ticks use `tickVolatilityScale` (default 15x) so prices visibly move in a demo.
- Simulated latency (80–450 ms), socket drops and ~2% `503 UNAVAILABLE` errors are on by
  default (`src/chaos.ts`). `CHAOS=off pnpm dev` turns them off; `ERROR_RATE=0.3` raises
  errors to test the error UI. Tests always run with chaos off.
- Socket drops come in two kinds: an abrupt close, and a *silent* stall (socket stays
  open, nothing arrives) that only the client's heartbeat timeout can detect.
- One HTTP server serves REST (`src/http`, routes registered from `endpoints`) and the
  WebSocket (`src/ws`, upgrade on `WS_PATH`), so dev and production are same-origin.
  Handlers are typed with `EndpointResponse<K>` and can't return the wrong shape.
- On `subscribe` the server sends a snapshot of the newly added symbols' prices, so a
  reconnecting client is current immediately.
- The watchlist is in memory, per user id; every request is the demo user until sign-in exists.
- Server tests start a real server on port 0 (`src/testing.ts`) and parse every
  response and socket message with the contracts.

## Conventions

- TypeScript strict, no `any`. TS 6+ doesn't auto-load `@types/*`: list them in `types`
  in that package's tsconfig (the server uses `"types": ["node"]`).
- No non-null `!` in app code unless a comment says why (fine in tests).
- Name a zod schema and its type the same: `export const Stock = z.object(...)`,
  `export type Stock = z.infer<typeof Stock>`.
- Prices are numbers in USD. Format only in the UI with `Intl.NumberFormat`.
  Show tabular numbers for prices.
- The mock market trades 24/7, so "today" is a rolling 24-hour window. The 24h change
  is derived on the client from `price` and `price24hAgo`.
- Small, focused files. Colocate a component's test next to it (`Foo.test.tsx`).
- Every async UI has loading, empty, error and stale states; see the wireframes.
- Accessibility: never rely on colour alone (always show +/−), keyboard reachable,
  respect `prefers-reduced-motion`.

## Testing

- Vitest for unit tests (price engine, socket client with fake timers, reducers,
  formatters); React Testing Library for components; one Playwright happy path.
- Tests must be deterministic: seed the engine and turn simulated failures off.

## Working with AI on this repo

- Explain the plan before large changes; keep diffs small and reviewable.
- Run `pnpm typecheck` (and tests once they exist) before saying something is done.
- When the AI gets something wrong and is corrected, add a row to
  `docs/ai-workflow.md`. Add notable decisions to `docs/readme-notes.md`.
- Tooling moves fast (pnpm 12, TypeScript 7, Node 26): check version-specific
  advice instead of assuming.
