import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { installMatchMedia, resetViewport } from "./media";

// Before any app module loads: the theme store reads matchMedia on import.
installMatchMedia();

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetViewport();
});
