import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

/** Unit and component tests: the app's Vite config plus a browser-like DOM (jsdom). */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      restoreMocks: true,
    },
  }),
);
