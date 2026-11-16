import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import BackTop from "./BackTop.svelte";

describe("BackTop Component", () => {
  it("renders when scroll exceeds threshold and handles scroll click", async () => {
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;
    Object.defineProperty(window, "scrollY", { value: 300, writable: true, configurable: true });

    const { container } = render(BackTop, {
      props: {
        threshold: 200,
      },
    });

    window.dispatchEvent(new Event("scroll"));

    const btn = container.querySelector('[data-svadmin-component="BackTop"]');
    expect(btn).not.toBeNull();

    if (btn) {
      await fireEvent.click(btn);
      expect(scrollToMock).toHaveBeenCalledWith(
        expect.objectContaining({ top: 0, behavior: "smooth" })
      );
    }
  });
});
