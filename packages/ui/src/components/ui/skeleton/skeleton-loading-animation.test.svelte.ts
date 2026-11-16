import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { Skeleton } from "./index.js";

describe("Skeleton loading and animation options", () => {
  it("renders placeholder with animation=true by default", () => {
    const { container } = render(Skeleton, {
      props: {
        class: "h-4 w-32",
      },
    });

    const el = container.querySelector('[data-slot="skeleton"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-animation")).toBe("true");
    expect(el?.classList.contains("animate-none")).toBe(false);
  });

  it("applies animate-none and data-animation=false when animation is disabled", () => {
    const { container } = render(Skeleton, {
      props: {
        animation: false,
      },
    });

    const el = container.querySelector('[data-slot="skeleton"]');
    expect(el?.getAttribute("data-animation")).toBe("false");
    expect(el?.classList.contains("animate-none")).toBe(true);
  });

  it("renders children content when loading is false", () => {
    const content = createRawSnippet(() => ({
      render: () => '<p data-testid="actual-content">Loaded data</p>',
    }));

    const { getByTestId, container } = render(Skeleton, {
      props: {
        loading: false,
        children: content,
      },
    });

    expect(getByTestId("actual-content")).toBeTruthy();
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  });
});
