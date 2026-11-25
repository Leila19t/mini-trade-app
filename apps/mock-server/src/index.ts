import { API_PREFIX, WS_PATH } from "@mini-trade/contracts";
import { configFromEnv } from "./config";
import { createMockServer } from "./server";

const config = configFromEnv();
const server = createMockServer(config);
const port = await server.listen(config.port);

const chaos = config.chaos
  ? `latency ${config.chaos.latencyMs.min}–${config.chaos.latencyMs.max} ms, ${config.chaos.errorRate * 100}% errors, socket drops on`
  : "off";
console.log(`mock server on http://localhost:${port}`);
console.log(`  REST ${API_PREFIX}  ·  WebSocket ${WS_PATH}  ·  ${server.engine.symbols().length} stocks  ·  seed ${config.seed}`);
console.log(`  chaos: ${chaos}   (CHAOS=off to disable)`);

const shutdown = () => {
  server.close().finally(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
