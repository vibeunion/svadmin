import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Spin from "./Spin.svelte";
import SpinHarness from "../../test/fixtures/SpinHarness.svelte";

describe("Spin Component", () => {
  it("renders standalone spinner with tip", () => {
    const { container } = render(Spin, {
      props: {
        tip: "加载中...",
      },
    });

    const root = container.querySelector(".svadmin-spin");
    expect(root).not.toBeNull();
    expect(container.textContent).toContain("加载中...");
  });

  it("wraps children with overlay loading container", () => {
    const { container, rerender } = render(SpinHarness, {
      props: {
        loading: true,
        tip: "正在同步数据...",
      },
    });

    const spinContainer = container.querySelector(".svadmin-spin-container");
    expect(spinContainer).not.toBeNull();
    const children = container.querySelector(".svadmin-spin-children");
    expect(children?.classList.contains("opacity-40")).toBe(true);
    expect(container.textContent).toContain("Card Content");
    expect(container.textContent).toContain("正在同步数据...");

    rerender({ loading: false, tip: "" });
    const updatedChildren = container.querySelector(".svadmin-spin-children");
    expect(updatedChildren?.classList.contains("opacity-40")).toBe(false);
  });
});
