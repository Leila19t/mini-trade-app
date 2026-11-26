import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { CHART_MODE_STORAGE_KEY } from "../helpers/constants";
import { setViewportWidth } from "../test/media";
import { PriceChartPanel } from "./PriceChartPanel";

/** Both chart panels are stubbed: this tests which one shows, and the switch between them. */
vi.mock("./SimpleChartPanel", () => ({
  SimpleChartPanel: ({ modeToggle }: { modeToggle?: ReactNode }) => (
    <div>
      simple chart{modeToggle}
    </div>
  ),
}));
vi.mock("./ProChartPanel", () => ({
  ProChartPanel: ({ modeToggle }: { modeToggle: ReactNode }) => (
    <div>
      pro chart{modeToggle}
    </div>
  ),
}));

function renderPanel(url = "/stocks/NVDA") {
  const router = createMemoryRouter([{ path: "/stocks/:symbol", element: <PriceChartPanel symbol="NVDA" /> }], {
    initialEntries: [url],
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe("PriceChartPanel", () => {
  it("starts on the Simple chart, with the switch", () => {
    renderPanel();
    expect(screen.getByText("simple chart")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simple" })).toHaveAttribute("aria-pressed", "true");
  });

  it("switches to Pro, writes it to the URL and remembers it", async () => {
    const router = renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Pro" }));
    expect(await screen.findByText("pro chart")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?mode=pro");
    expect(localStorage.getItem(CHART_MODE_STORAGE_KEY)).toBe("pro");
  });

  it("toggles with the P key, but not while typing", async () => {
    renderPanel();
    await userEvent.keyboard("p");
    expect(await screen.findByText("pro chart")).toBeInTheDocument();
    await userEvent.keyboard("p");
    expect(screen.getByText("simple chart")).toBeInTheDocument();

    const field = document.body.appendChild(document.createElement("input"));
    await userEvent.type(field, "p");
    expect(screen.getByText("simple chart")).toBeInTheDocument();
    field.remove();
  });

  it("opens the mode from the URL, which wins over the remembered one", async () => {
    localStorage.setItem(CHART_MODE_STORAGE_KEY, "simple");
    renderPanel("/stocks/NVDA?mode=pro");
    expect(await screen.findByText("pro chart")).toBeInTheDocument();
  });

  it("uses the remembered mode when the URL doesn't say", async () => {
    localStorage.setItem(CHART_MODE_STORAGE_KEY, "pro");
    renderPanel();
    expect(await screen.findByText("pro chart")).toBeInTheDocument();
  });

  it("always shows the Simple chart on phones, without the switch or the shortcut", async () => {
    setViewportWidth(390);
    renderPanel("/stocks/NVDA?mode=pro");
    expect(screen.getByText("simple chart")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pro" })).not.toBeInTheDocument();
    await userEvent.keyboard("p");
    expect(screen.queryByText("pro chart")).not.toBeInTheDocument();
  });

  it("follows the window: narrowing it falls back to Simple, widening brings Pro back", async () => {
    renderPanel("/stocks/NVDA?mode=pro");
    expect(await screen.findByText("pro chart")).toBeInTheDocument();
    act(() => setViewportWidth(500));
    expect(screen.getByText("simple chart")).toBeInTheDocument();
    act(() => setViewportWidth(1024));
    expect(screen.getByText("pro chart")).toBeInTheDocument();
  });
});
