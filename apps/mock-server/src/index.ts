import type { PriceTick } from "@mini-trade/contracts";

const tick: PriceTick = { type: "price", symbol: "AAPL", price: 231.42, timestamp: Date.now() };
console.log("mock server ready", tick);