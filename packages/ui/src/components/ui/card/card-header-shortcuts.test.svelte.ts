import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import Card from "./card.svelte";
import Alert from "../alert/alert.svelte";

describe("Card header shortcuts and Alert type alias enhancements", () => {
  it("renders card title and extra action slot directly from props", () => {
    const extraSnippet = createRawSnippet(() => ({
      render: () => '<a href="#more" data-testid="card-more">More</a>',
    }));
    const bodySnippet = createRawSnippet(() => ({
      render: () => '<p data-testid="card-body">Card inner content</p>',
    }));

    const { getByText, getByTestId, container } = render(Card, {
      props: {
        title: "Project Statistics",
        extra: extraSnippet,
        children: bodySnippet,
      },
    });

    expect(getByText("Project Statistics")).toBeTruthy();
    expect(getByTestId("card-more")).toBeTruthy();
    expect(getByTestId("card-body")).toBeTruthy();
    expect(container.querySelector('[data-slot="card-header"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="card-content"]')).not.toBeNull();
  });

  it("maps Alert type=error to destructive variant and type=info to default variant", () => {
    const { container: errorContainer } = render(Alert, {
      props: {
        type: "error",
        title: "Error message",
      },
    });
    const errorAlert = errorContainer.querySelector('[data-slot="alert"]');
    expect(errorAlert?.getAttribute("data-variant")).toBe("destructive");

    const { container: infoContainer } = render(Alert, {
      props: {
        type: "info",
        title: "Info message",
      },
    });
    const infoAlert = infoContainer.querySelector('[data-slot="alert"]');
    expect(infoAlert?.getAttribute("data-variant")).toBe("default");
  });
});
