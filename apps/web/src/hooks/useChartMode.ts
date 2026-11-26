import { useSearchParams } from "react-router";
import { CHART_MODE_STORAGE_KEY, params } from "../helpers/constants";
import type { ChartMode } from "../helpers/types";

function isChartMode(value: unknown): value is ChartMode {
  return value === "simple" || value === "pro";
}

function readStoredMode(): ChartMode {
  try {
    const stored = localStorage.getItem(CHART_MODE_STORAGE_KEY);
    return isChartMode(stored) ? stored : "simple";
  } catch {
    return "simple"; // storage blocked (private mode, sandboxed iframe)
  }
}

/**
 * Simple or Pro chart. The URL wins (?mode=pro, so a link opens the same view);
 * without it, the last mode picked in this browser. Changing it updates both.
 */
export function useChartMode() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get(params.mode);
  const mode: ChartMode = isChartMode(fromUrl) ? fromUrl : readStoredMode();

  const setMode = (value: ChartMode) => {
    try {
      localStorage.setItem(CHART_MODE_STORAGE_KEY, value);
    } catch {
      // Not remembered, but the URL still has it.
    }
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set(params.mode, value);
        return next;
      },
      { replace: true },
    );
  };

  return { mode, setMode, toggleMode: () => setMode(mode === "pro" ? "simple" : "pro") };
}
