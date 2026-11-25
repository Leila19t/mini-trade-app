import { describe, expect, it } from "vitest";
import { Chaos, type ChaosOptions } from "./chaos";
import { configFromEnv, DEFAULT_CHAOS } from "./config";

const options: ChaosOptions = {
  latencyMs: { min: 100, max: 300 },
  errorRate: 0.1,
  socketDropAfterMs: { min: 1_000, max: 2_000 },
  silentDropShare: 0.3,
};

/** A "random" source that returns these values in order. */
const sequence = (...values: number[]) => () => values.shift() ?? 0;

describe("Chaos", () => {
  it("does nothing when disabled", () => {
    const chaos = new Chaos(false, () => 0);
    expect(chaos.enabled).toBe(false);
    expect(chaos.latency()).toBe(0);
    expect(chaos.shouldFail()).toBe(false);
    expect(chaos.socketDrop()).toBeUndefined();
  });

  it("picks latency within the range", () => {
    expect(new Chaos(options, () => 0).latency()).toBe(100);
    expect(new Chaos(options, () => 0.5).latency()).toBe(200);
  });

  it("fails below the error rate only", () => {
    expect(new Chaos(options, () => 0.05).shouldFail()).toBe(true);
    expect(new Chaos(options, () => 0.1).shouldFail()).toBe(false);
  });

  it("schedules close or silent drops", () => {
    expect(new Chaos(options, sequence(0.5, 0.9)).socketDrop()).toEqual({ kind: "close", afterMs: 1_500 });
    expect(new Chaos(options, sequence(0, 0.1)).socketDrop()).toEqual({ kind: "silent", afterMs: 1_000 });
  });
});

describe("configFromEnv", () => {
  it("uses defaults", () => {
    const config = configFromEnv({});
    expect(config.port).toBe(4000);
    expect(config.chaos).toEqual(DEFAULT_CHAOS);
  });

  it("reads PORT, SEED, CHAOS and ERROR_RATE", () => {
    expect(configFromEnv({ PORT: "5000", SEED: "7" })).toMatchObject({ port: 5000, seed: 7 });
    expect(configFromEnv({ CHAOS: "off" }).chaos).toBe(false);
    expect(configFromEnv({ ERROR_RATE: "0.5" }).chaos).toMatchObject({ errorRate: 0.5 });
  });

  it("ignores invalid values", () => {
    expect(configFromEnv({ PORT: "abc" }).port).toBe(4000);
    expect(configFromEnv({ ERROR_RATE: "2" }).chaos).toMatchObject({ errorRate: DEFAULT_CHAOS.errorRate });
  });
});
