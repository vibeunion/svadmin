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

  it("supports active option as an alias for animation", () => {
    const { container } = render(Skeleton, {
      props: {
        active: false,
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

  it("renders structured paragraph text skeleton lines", () => {
    const { container } = render(Skeleton, {
      props: {
        text: { rows: 4, width: ['100%', '80%', '60%', 120] },
        round: true,
      },
    });

    const textContainer = container.querySelector('[data-slot="skeleton-text"]');
    expect(textContainer).not.toBeNull();
    const lines = container.querySelectorAll('[data-slot="skeleton-line"]');
    expect(lines.length).toBe(4);
    expect((lines[3] as HTMLElement | undefined)?.style.width).toBe('120px');
    expect(lines[0]?.classList.contains('rounded-full')).toBe(true);
  });

  it("renders structured image and avatar skeleton block", () => {
    const { container } = render(Skeleton, {
      props: {
        image: { shape: 'circle', size: 'large' },
        text: true,
      },
    });

    const img = container.querySelector('[data-slot="skeleton-image"]');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('data-shape')).toBe('circle');
    expect(img?.getAttribute('data-size')).toBe('large');
    expect(img?.classList.contains('rounded-full')).toBe(true);
    expect(container.querySelector('[data-slot="skeleton-text"]')).not.toBeNull();
  });
});
