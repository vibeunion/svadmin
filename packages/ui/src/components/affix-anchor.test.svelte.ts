import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import Anchor, { type AnchorItem } from "./Anchor.svelte";

describe("Anchor Enhancements", () => {
  const items: AnchorItem[] = [
    { id: "sec-1", label: "Section 1" },
    { id: "sec-2", label: "Section 2" },
  ];

  it("renders anchor items and triggers onselect callback on click", async () => {
    const onselect = vi.fn();
    const { getByRole } = render(Anchor, {
      props: {
        items,
        targetOffset: 80,
        onselect,
      },
    });

    const btn = getByRole("button", { name: "Section 1" });
    expect(btn).toBeDefined();

    // Stub target element
    const sec1 = document.createElement("div");
    sec1.id = "sec-1";
    document.body.appendChild(sec1);

    await fireEvent.click(btn);
    expect(onselect).toHaveBeenCalledWith("sec-1");

    sec1.remove();
  });
});
