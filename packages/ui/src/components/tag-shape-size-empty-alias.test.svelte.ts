import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Tag from "./Tag.svelte";
import EmptyState from "./EmptyState.svelte";
import { Empty } from "../index.js";

describe("Tag & Empty Arco Parity Enhancements", () => {
  it("supports round shape and large size in Tag", () => {
    const { container } = render(Tag, {
      props: {
        shape: "round",
        size: "large",
        color: "arcoblue",
      },
    });

    const tag = container.querySelector(".svadmin-tag");
    expect(tag).not.toBeNull();
    expect(tag?.getAttribute("data-shape")).toBe("round");
    expect(tag?.getAttribute("data-size")).toBe("large");
    expect(tag?.className).toContain("rounded-full");
    expect(tag?.className).toContain("bg-primary/10");
  });

  it("supports imgSrc alias in EmptyState and verifies Empty export", () => {
    expect(Empty).toBe(EmptyState);

    const { container } = render(Empty, {
      props: {
        title: "No Data",
        imgSrc: "https://example.com/empty.svg",
      },
    });

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/empty.svg");
  });
});
