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
