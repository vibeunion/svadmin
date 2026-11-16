import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Link from "./Link.svelte";
import LinkHarness from "../../test/fixtures/LinkHarness.svelte";

describe("Link external icon", () => {
  it("renders external link icon when icon is true", () => {
    const { container } = render(LinkHarness, {
      props: {
        href: "https://example.com/docs",
        icon: true,
      },
    });

    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://example.com/docs");
    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
  });
});
