import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SortSelect } from "./SortSelect";

function setup(value: Parameters<typeof SortSelect>[0]["value"] = "name") {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(
    <div>
      <SortSelect value={value} onChange={onChange} />
      <p>Outside</p>
    </div>,
  );
  const trigger = screen.getByRole("combobox", { name: "Sort by" });
  return { user, onChange, trigger };
}

describe("SortSelect", () => {
  it("shows the current option and starts closed", () => {
    const { trigger } = setup("price-desc");
    expect(trigger).toHaveTextContent("Price (high–low)");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens on click and picks an option", async () => {
    const { user, onChange, trigger } = setup();
    await user.click(trigger);
    expect(screen.getByRole("option", { name: "Name (A–Z)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.click(screen.getByRole("option", { name: "Today (best first)" }));
    expect(onChange).toHaveBeenCalledWith("change-desc");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("works with the keyboard", async () => {
    const { user, onChange, trigger } = setup();
    trigger.focus();

    await user.keyboard("{ArrowDown}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const active = () => document.getElementById(trigger.getAttribute("aria-activedescendant") ?? "");
    expect(active()).toHaveTextContent("Name (A–Z)");

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(active()).toHaveTextContent("Price (low–high)");
    await user.keyboard("{End}");
    expect(active()).toHaveTextContent("Today (worst first)");

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("change-asc");
    expect(trigger).toHaveFocus();
  });

  it("closes on Escape and on an outside click without changing the sort", async () => {
    const { user, onChange, trigger } = setup();
    await user.click(trigger);
    await user.keyboard("{ArrowDown}{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    await user.click(screen.getByText("Outside"));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
  });
});
