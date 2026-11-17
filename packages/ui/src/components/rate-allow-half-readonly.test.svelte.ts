import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import Rate from "./Rate.svelte";

describe("Rate allowHalf, readonly, and size enhancements", () => {
  it("supports readonly mode without interactive modification", async () => {
    const onchange = vi.fn();
    const { container } = render(Rate, {
      props: {
        value: 3,
        readonly: true,
        onchange,
      },
    });

    const root = container.querySelector(".svadmin-rate");
    expect(root?.getAttribute("data-readonly")).toBe("true");

    const buttons = container.querySelectorAll("button");
    expect(buttons[0]?.classList.contains("svadmin-rate__button--readonly")).toBe(true);

    await fireEvent.click(buttons[4] as HTMLButtonElement);
    expect(onchange).not.toHaveBeenCalled();
  });

  it("supports allowHalf and renders half star indicator", () => {
    const { container } = render(Rate, {
      props: {
        value: 2.5,
        allowHalf: true,
      },
    });

    const halfIndicator = container.querySelector(".svadmin-rate__half");
    expect(halfIndicator).not.toBeNull();
  });

  it("sets data-size attribute correctly", () => {
    const { container } = render(Rate, {
      props: {
        value: 4,
        size: "small",
      },
    });

    const root = container.querySelector(".svadmin-rate");
    expect(root?.getAttribute("data-size")).toBe("small");
  });
});
