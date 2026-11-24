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
