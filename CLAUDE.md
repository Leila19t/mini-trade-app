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
```

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
- **Imports flow one way:** apps → packages. Packages never import apps; apps never
  import each other.
- **Dependencies live where they are used.** Shared dev tooling only at the root.
  Ask before adding a new dependency.

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
- Simulated latency, socket drops and ~2% request errors are on by default, and can
  be switched off for tests.

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
