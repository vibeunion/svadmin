import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Timeline, { type TimelineEntry } from "./Timeline.svelte";
import TimelineDotHarness from "../../test/fixtures/TimelineDotHarness.svelte";

describe("Timeline Component", () => {
  const items: TimelineEntry[] = [
    { id: "1", title: "创建项目", time: "09:00", tone: "success" },
    { id: "2", title: "代码构建中", time: "09:30", tone: "info", active: true },
    { id: "3", title: "部署上线", time: "10:00", tone: "neutral" },
  ];

  it("renders timeline entries with active status", () => {
    const { container } = render(Timeline, {
      props: { items },
    });

    const entries = container.querySelectorAll(".svadmin-timeline__item");
    expect(entries).toHaveLength(3);
    expect(entries[1]?.getAttribute("data-active")).toBe("true");
    expect(entries[0]?.textContent).toContain("创建项目");
    expect(entries[1]?.textContent).toContain("代码构建中");
  });

  it("renders custom dot snippet", () => {
    const { container } = render(TimelineDotHarness);
    const customDot = container.querySelector(".svadmin-timeline__custom-dot");
    expect(customDot).not.toBeNull();
    expect(customDot?.textContent).toContain("★");
  });
});
