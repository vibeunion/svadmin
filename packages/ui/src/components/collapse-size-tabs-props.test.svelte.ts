import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import Collapse from "./Collapse.svelte";
import { Tabs } from "./ui/tabs/index.js";

describe("Collapse size and Tabs type/orientation enhancements", () => {
  it("renders Collapse with size attributes", () => {
    const content = createRawSnippet(() => ({ render: () => '<span>Body</span>' }));
    const { container } = render(Collapse, {
      props: {
        size: "small",
        items: [{ id: "1", title: "Section 1", content }],
      },
    });

    const el = container.querySelector(".svadmin-collapse");
    expect(el?.getAttribute("data-size")).toBe("small");
  });

  it("propagates type and orientation from Tabs root to TabsList", () => {
    const { container } = render(Tabs, {
      props: {
        type: "card",
        orientation: "vertical",
      },
    });

    const tabsRoot = container.querySelector('[data-slot="tabs"]');
    expect(tabsRoot?.getAttribute("data-variant")).toBe("card");
    expect(tabsRoot?.getAttribute("data-orientation")).toBe("vertical");
  });
});
