import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import chevronDown from "../../assets/icons/chevron-down.svg";
import { SORT_OPTIONS } from "../../helpers/constants";
import type { SortKey } from "../../helpers/types";

interface SortSelectProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    SORT_OPTIONS.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = SORT_OPTIONS[selectedIndex];

  // Close when a click lands outside the control.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function openList(index = selectedIndex) {
    setActiveIndex(index);
    setOpen(true);
  }

  function choose(index: number) {
    const option = SORT_OPTIONS[index];
    if (option && option.value !== value) onChange(option.value);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = SORT_OPTIONS.length - 1;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, last));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelId}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-bg-surface py-2.25 pr-2.5 pl-3 text-sm leading-[normal] transition-colors duration-120 hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <span id={labelId} className="text-text-muted max-sm:sr-only">
          Sort by
        </span>
        <span className="font-medium text-text-primary">{selected?.label}</span>
        <img
          src={chevronDown}
          alt=""
          width={16}
          height={16}
          className={`transition-transform duration-120 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>

      <ul
        id={listId}
        role="listbox"
        aria-labelledby={labelId}
        hidden={!open}
        className="absolute top-full right-0 z-20 mt-1 min-w-full origin-top-right animate-fade-in rounded-lg border border-border-default bg-bg-surface p-1 text-sm leading-[normal] whitespace-nowrap drop-shadow-[0px_8px_12px_rgba(15,23,41,0.12)] motion-reduce:animate-none"
      >
        {SORT_OPTIONS.map((option, index) => {
          const isSelected = index === selectedIndex;
          const isActive = index === activeIndex;
          return (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              onPointerEnter={() => setActiveIndex(index)}
              // Keep focus on the button so keyboard handling keeps working.
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              className={`cursor-pointer rounded-sm px-3 py-2 ${
                isSelected
                  ? "font-semibold text-brand-primary"
                  : "text-text-primary"
              } ${isActive ? "bg-bg-subtle" : ""}`}
            >
              {option.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
