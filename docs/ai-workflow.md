# AI workflow

How I used AI on this project: what I asked for, what it got right, and where I had to correct it.

> Draft log. Edit into final form before submitting.

## Setup

- **Claude (claude.ai app)** as a planning and pairing partner, with access to this repo folder on my machine and to Figma through the Figma connector.
- **Figma** for the architecture diagram and the wireframes, which Claude drew from our discussion and I reviewed.
- `CLAUDE.md` at the repo root (to add) gives every new AI session the same context: folder map, commands, conventions.

## How I worked

1. Discussed the brief and the trade-offs before writing any code (stack, state management, how realistic the mock should be).
2. Made the decisions myself, using the job description as a guide (Sarwa uses React, TypeScript, Redux, TanStack Query).
3. Had the AI produce the diagram and wireframes, then reviewed them as a designer.
4. Typed the scaffold myself so I understand the monorepo structure, and used the AI to diagnose errors.

## Log

### 2026-11-24: planning

- **Stack:** chose React + TypeScript + Vite over React Native (Expo). React Native is a plus for the role, but I'm much stronger on web, and a polished web app is better than a rough first React Native app.
- **State:** Redux Toolkit for client state (live prices, connection status) and TanStack Query for server state (stock list, history, watchlist). This matches Sarwa's stack, and each tool gets the job it's built for.
- **Monorepo:** pnpm workspaces with `apps/web`, `apps/mock-server` and `packages/contracts`.
- **Mock data:** real tickers with simulated prices from a seeded random walk (geometric Brownian motion).

### 2026-11-24: design

- Claude drew the architecture diagram and 9 wireframes in Figma (list, watchlist, empty, loading, reconnecting, detail, errors, and mobile list and detail), each with UX notes. I asked for simple visuals so we could focus on UX and states first.

### 2026-11-24: scaffolding, corrections

| What the AI suggested | What went wrong | What I did |
|---|---|---|
| Install pnpm with `corepack enable` | Corepack no longer ships with Node.js 25+ | Corrected it; installed pnpm with `npm install -g pnpm` and pinned the version with `packageManager` |
| `pnpm --filter @mini-trade/server add ws @mini-trade/contracts --workspace` | `--workspace` applies to every package in the command; `ws` is on npm, not in the workspace, so the whole command failed | The AI read the repo to find the cause; split it into one command for npm packages and one for the workspace package |
| (none) | `pnpm install` failed with `ERR_PNPM_IGNORED_BUILDS` for `esbuild` (pulled in by `tsx`) | pnpm blocks install scripts by default as a supply-chain protection. Approved only `esbuild`, with `pnpm approve-builds` |
| (none) | `pnpm typecheck` printed the `tsc` help page and failed in `packages/contracts` | That package had no `tsconfig.json`. Every package needs its own, extending `tsconfig.base.json` |
| (open) | The root has TypeScript 7; the Vite template added TypeScript 6 to `apps/web` | Decide on one TypeScript version for the whole repo |

## Takeaways

- The AI is fast at diagnosis when it can read the actual files, rather than guessing from an error message.
- It can be out of date on tooling (the Corepack change), so I check version-sensitive advice.

### 2026-11-24: CLAUDE.md and contracts

- Added `CLAUDE.md` so every AI session starts from the same context: repo map, commands, architecture rules (contracts first, validate at the boundary, Redux vs TanStack Query split), conventions and testing expectations.
- Claude wrote the full contracts package from our earlier design. I reviewed the decisions:
  - Price ticks are **batched** (`prices` message with many ticks) rather than one message per tick, so the client applies a batch in one state update.
  - Server-sent **heartbeat** plus a `welcome` message announcing its interval, so the client can detect a dead socket (browsers can't send WebSocket ping frames).
  - All HTTP endpoints in one `endpoints` map (route for the server, path builder and response schema for the client).
  - The list response includes a small `trend` array for the sparklines, to avoid one history request per row.
  - Today's change is derived on the client, not sent.
- Verified: contracts and server typecheck with TypeScript 7.0.2, plus 10 quick parse/reject checks (bad ticker, negative price, empty batch, unknown range…).

### 2026-11-25: design direction and scope

- Design direction (mine): Sarwa's signature green so it feels familiar, no gradients, rich but purposeful motion. Claude pulled the exact palette from sarwa.co with the browser (green #07351A, off-white #F8F9F9, near-black #0A140A, accent yellow #FFB932).
- Claude turned the Figma palette into 26 Light/Dark colour variables and bound all 395 colours in the screens to them, which gives dark mode for free and maps 1:1 to CSS variables in code. It then added: theme toggle, Google sign-in / user menu, account drawer, signed-out states, price-alert settings, alert notifications, dark versions of the key screens, and a motion spec.
- Correction: a few new layers rendered wrong (black rows, solid chart fill, opaque scrim) because colour overrides were created with a placeholder colour and paint-level opacity didn't survive variable binding. Fixed by setting real colour values and using layer opacity; caught by checking screenshots, not by trusting the script's success.
- Scope call (mine): ship the original brief first, then add extras if time allows. Decided: alerts are % moves, not price targets; sign-in only for the watchlist; Better Auth for Google sign-in; Render for hosting (I've used it before, and it avoids EC2 ops work).

### 2026-11-25: price engine

- Claude built the price engine in `apps/mock-server/src/engine` with 29 tests, verified (typecheck + tests) before writing to the repo.
- Design choice it raised for review: the mock market trades 24/7, so there is no exchange "previous close" or "open". It renamed the contract fields to say what they are (`price24hAgo`, `high24h`, `low24h`, `volume24h`) and dropped `open`, rather than keep names that would mislead in a fintech codebase.
- Finding: TypeScript 6+ no longer loads `@types/node` automatically, so `process` was unknown in the server. Fixed with `"types": ["node"]` in the server tsconfig and noted in CLAUDE.md.

### 2026-11-25: mock server (REST + WebSocket)

- Claude wrapped the price engine in a real server: REST on plain `node:http` with a small router (no Express, so no new dependency) and live prices over `ws`. Built and tested in its own sandbox first, then written to the repo. 83 tests, all on a real server on a random port.
- Choices it raised for review:
  - **Routes come from `endpoints` in contracts**, and a new `EndpointResponse<K>` type makes each handler return exactly its response schema. The server can't drift from the client.
  - **Chaos fails a request before the handler runs**, so a failed watchlist PUT/DELETE really didn't happen. That makes optimistic updates with rollback honest.
  - **Two kinds of socket drop:** an abrupt close, and a silent stall where the socket stays open but nothing arrives. Only a heartbeat timeout catches the second, so the client's heartbeat logic actually gets exercised.
  - **Snapshot on subscribe:** after (re)subscribing, the client gets current prices at once instead of waiting for each stock's next move.
- Check on the tests: Claude broke the code on purpose (sent every tick to every socket; failed after the watchlist change instead of before) to confirm the tests catch it. 4 tests failed as expected, then passed again 5 runs in a row once the code was restored.

### 2026-11-25: OpenAPI docs

- I asked for OpenAPI docs and skipped a Postman collection to save time, since the role is frontend-focused.
- Claude generated the OpenAPI 3.1 file from the zod contracts with zod's built-in `z.toJSONSchema`, so it needs no new dependency and can't drift from the code. Shared schemas (Ticker, Price, StockSummary…) become `$ref`d components, and the WebSocket message schemas are included so the socket is documented too.
- Guard rails: a typed `docs` map means a new endpoint without docs fails typecheck, and a test fails if the checked-in `docs/openapi.json` is stale. The server serves `/api/openapi.json` and a Swagger UI page at `/docs`, outside the chaos layer so the docs never fail at random.

- Correction: one server test failed on my Mac (404 instead of 400) but passed in Claude's sandbox. Cause: test servers listened on all interfaces while the tests connected to `127.0.0.1`, and macOS can hand out a port that another program already holds on `127.0.0.1`, so the request reached that program. Fixed by binding test servers to `127.0.0.1`. Error assertions now print the response body, so a failure like this shows where the answer came from.

### 2026-11-25: web structure, routing and header

- Folder structure for `apps/web/src` is mine (screens / views / components / helpers / hooks / assets); Claude scaffolded it and suggested `MarketsScreen` / `StockDetailScreen` names. Added React Router after Claude asked first, since it's a new dependency.
- Header built from the Figma frame with the Figma MCP. Figma's temporary asset URLs were blocked on both Claude's sandbox and my machine, so Claude exported the four icons through the Figma plugin API instead: the same vectors, not redrawn. It also read all 26 Light/Dark theme variables into `tokens.css`.
- Claude designed a small logo (brand-green square, rising price line, yellow accent dot) used in the header and as the favicon from one file.
- Verified in headless Chrome at 1440px against the Figma frame: every element within 2px of its Figma position. Correction it caught itself: the header was 65px (64 + border) instead of Figma's 64 including the border.
- No mobile header is designed yet, so below 640px Claude hid the search and made sign-in icon-only (still labelled for screen readers). To revisit in Figma.

### 2026-11-25: Tailwind

- I asked to move all styling to Tailwind (v4.3, latest). Claude kept the Figma tokens in `tokens.css` and mapped them into Tailwind's theme with the Figma group in the name (`bg-bg-surface`, `text-text-muted`), and switched off Tailwind's default palette so only design-system colours can be used.
- Check: screenshots of the header before (CSS Modules) and after (Tailwind) at 1440, 800 and 390px compared pixel by pixel. The first pass differed by about 1,000 pixels: Tailwind's reset sets a 1.5 line height that shifted the pills by a fraction of a pixel. After making their wrappers flex, the two versions were pixel-identical at all three widths.
