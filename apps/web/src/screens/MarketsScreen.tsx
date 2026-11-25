/**
 * Home screen: every stock with its live price, plus the user's watchlist.
 * Screens only lay out views; data fetching lives in hooks, UI pieces in views/components.
 */
export function MarketsScreen() {
  return (
    <main className="mx-auto max-w-page p-6 min-h-[calc(100vh-128px)]">
      <h1 className="text-2xl font-bold">Markets</h1>
    </main>
  );
}
