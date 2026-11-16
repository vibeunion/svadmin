import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Image from "./Image.svelte";

describe("Image overlay and title/description enhancements", () => {
  it("renders title and description caption", () => {
    const { container, getByText } = render(Image, {
      src: "https://example.com/banner.png",
      alt: "Banner",
      title: "Hero Banner",
      description: "Homepage hero visual",
    });

    expect(getByText("Hero Banner")).toBeTruthy();
    expect(getByText("Homepage hero visual")).toBeTruthy();
    expect(container.querySelector(".svadmin-image__title")).not.toBeNull();
    expect(container.querySelector(".svadmin-image__description")).not.toBeNull();
  });

  it("renders preview zoom overlay when preview is true", () => {
    const { container } = render(Image, {
      src: "https://example.com/photo.png",
      alt: "Photo",
      preview: true,
    });

    const overlay = container.querySelector('[data-slot="image-overlay"]');
    expect(overlay).not.toBeNull();
  });
});
