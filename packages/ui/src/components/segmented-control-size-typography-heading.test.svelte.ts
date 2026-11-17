import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import SegmentedControl from "./SegmentedControl.svelte";
import Typography from "./Typography.svelte";

describe("SegmentedControl size and Typography heading alias enhancements", () => {
  it("renders SegmentedControl with small size attribute", () => {
    const { container } = render(SegmentedControl, {
      props: {
        ariaLabel: "Display density",
        size: "small",
        options: [
          { value: "compact", label: "Compact" },
          { value: "relaxed", label: "Relaxed" },
        ],
      },
    });

    const el = container.querySelector(".svadmin-segmented-control");
    expect(el?.getAttribute("data-size")).toBe("small");
  });

  it("renders Typography with heading alias and bold class", () => {
    const textSnippet = createRawSnippet(() => ({ render: () => "Dashboard Title" }));

    const { container, getByRole } = render(Typography, {
      props: {
        heading: 2,
        bold: true,
        children: textSnippet,
      },
    });

    const heading = getByRole("heading", { level: 2 });
    expect(heading).toBeTruthy();
    expect(heading.getAttribute("data-heading")).toBe("2");
    expect(heading.classList.contains("font-bold")).toBe(true);
  });
});
