import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Timeline, { type TimelineEntry } from "./Timeline.svelte";

describe("Timeline reverse and alternate mode enhancements", () => {
  const items: TimelineEntry[] = [
    { id: "1", title: "Step 1", time: "09:00" },
    { id: "2", title: "Step 2", time: "10:00" },
    { id: "3", title: "Step 3", time: "11:00" },
  ];

  it("reverses chronological display order when reverse is true", () => {
    const { container } = render(Timeline, {
      props: {
        items,
        reverse: true,
      },
    });

    const titles = Array.from(container.querySelectorAll(".svadmin-timeline__title")).map(
      (el) => el.textContent?.trim()
    );
    expect(titles).toEqual(["Step 3", "Step 2", "Step 1"]);
  });

  it("assigns alternating left and right sides when mode is alternate", () => {
    const { container } = render(Timeline, {
      props: {
        items,
        mode: "alternate",
      },
    });

    const list = container.querySelector(".svadmin-timeline");
    expect(list?.getAttribute("data-mode")).toBe("alternate");

    const entries = container.querySelectorAll(".svadmin-timeline__item");
    expect(entries[0]?.getAttribute("data-side")).toBe("left");
    expect(entries[1]?.getAttribute("data-side")).toBe("right");
    expect(entries[2]?.getAttribute("data-side")).toBe("left");
  });
});
