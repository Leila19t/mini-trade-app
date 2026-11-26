import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChartModeToggle } from "./ChartModeToggle";

describe("ChartModeToggle", () => {
  it("marks the current mode as pressed", () => {
    render(<ChartModeToggle value="simple" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Simple" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Pro" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the mode that was clicked", async () => {
    const onChange = vi.fn();
    render(<ChartModeToggle value="simple" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Pro" }));
    expect(onChange).toHaveBeenCalledWith("pro");
  });

  it("advertises the P shortcut", () => {
    render(<ChartModeToggle value="pro" onChange={() => {}} />);
    for (const button of screen.getAllByRole("button")) expect(button).toHaveAttribute("aria-keyshortcuts", "P");
  });
});
