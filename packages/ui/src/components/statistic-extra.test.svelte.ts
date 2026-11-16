import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Statistic from "./Statistic.svelte";

describe("Statistic Extra and GroupSeparator", () => {
  it("renders extra slot and formatted group separator", () => {
    const { container } = render(Statistic, {
      props: {
        title: "总交易额",
        value: 1250000,
        groupSeparator: true,
        extra: "较上周增长 12%",
      },
    });

    expect(container.textContent).toContain("1,250,000");
    expect(container.textContent).toContain("较上周增长 12%");
  });
});
