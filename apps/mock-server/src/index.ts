import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { API_PREFIX, WS_PATH } from "@mini-trade/contracts";
import { configFromEnv } from "./config";
import { createMockServer } from "./server";

/** The built web app. When it exists (production, or after `pnpm build`), the server serves it too. */
const WEB_DIST = fileURLToPath(new URL("../../web/dist", import.meta.url));

const config = { ...configFromEnv(), webDir: existsSync(WEB_DIST) ? WEB_DIST : undefined };
const server = createMockServer(config);
const port = await server.listen(config.port);

const chaos = config.chaos
  ? `latency ${config.chaos.latencyMs.min}–${config.chaos.latencyMs.max} ms, ${config.chaos.errorRate * 100}% errors, socket drops on`
  : "off";
console.log(`mock server on http://localhost:${port}`);
console.log(`  REST ${API_PREFIX}  ·  WebSocket ${WS_PATH}  ·  ${server.engine.symbols().length} stocks  ·  seed ${config.seed}`);
console.log(`  chaos: ${chaos}   (CHAOS=off to disable)`);
console.log(`  web app: ${config.webDir ? `serving ${config.webDir}` : "not built (Vite serves it in dev)"}`);

const shutdown = () => {
  server.close().finally(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
