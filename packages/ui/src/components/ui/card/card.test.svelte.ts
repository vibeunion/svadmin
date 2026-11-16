import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Card from "./card.svelte";

describe("Card states", () => {
  it("renders hoverable card with hover class and attribute", () => {
    const { container } = render(Card, {
      props: {
        hoverable: true,
      },
    });

    const card = container.querySelector('[data-slot="card"]');
    expect(card).not.toBeNull();
    expect(card?.getAttribute("data-hoverable")).toBe("true");
    expect(card?.classList.contains("svadmin-card--hoverable")).toBe(true);
  });

  it("renders skeleton placeholder when loading is true", () => {
    const { container } = render(Card, {
      props: {
        loading: true,
      },
    });

    const loadingSlot = container.querySelector('[data-slot="card-loading"]');
    expect(loadingSlot).not.toBeNull();
  });
});
