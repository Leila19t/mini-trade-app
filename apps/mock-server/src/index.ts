import { PriceEngine } from "./engine";

// Temporary entry point until the HTTP + WebSocket server exists:
// starts the engine and logs a few live ticks so `pnpm dev` shows it working.
const engine = new PriceEngine({ seed: Number(process.env.SEED ?? 42) });
console.log(`price engine ready: ${engine.symbols().length} stocks`);

setInterval(() => {
  const ticks = engine.tick();
  const sample = ticks.slice(0, 3).map((t) => `${t.symbol} ${t.price.toFixed(2)}`).join("  ");
  console.log(`${ticks.length} ticks  ${sample}`);
}, 1000);
