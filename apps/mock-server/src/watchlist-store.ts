import type { Ticker } from "@mini-trade/contracts";

/**
 * In-memory watchlists, keyed by user id. Until sign-in exists every request
 * belongs to one demo user; the store is already per-user so auth can slot in
 * without changing it. Swapping this for a database later keeps the same methods.
 */
export class WatchlistStore {
  private readonly lists = new Map<string, Ticker[]>();

  constructor(private readonly initial: readonly Ticker[] = []) {}

  /** Most recently added first. */
  get(userId: string): Ticker[] {
    return [...this.list(userId)];
  }

  /** Adding a symbol that is already there is a no-op (PUT is idempotent). */
  add(userId: string, symbol: Ticker): Ticker[] {
    const list = this.list(userId);
    if (!list.includes(symbol)) list.unshift(symbol);
    return [...list];
  }

  /** Removing a symbol that isn't there is a no-op (DELETE is idempotent). */
  remove(userId: string, symbol: Ticker): Ticker[] {
    const next = this.list(userId).filter((s) => s !== symbol);
    this.lists.set(userId, next);
    return [...next];
  }

  private list(userId: string): Ticker[] {
    let list = this.lists.get(userId);
    if (!list) {
      list = [...this.initial];
      this.lists.set(userId, list);
    }
    return list;
  }
}
