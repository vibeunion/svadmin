import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import { Avatar } from "./index.js";

describe("Avatar shape options", () => {
  it("defaults to circle shape with data-shape attribute", () => {
    const { container } = render(Avatar, {
      props: {
        fallback: "JD",
      },
    });

    const fallback = container.querySelector('[data-slot="avatar-fallback"]');
    expect(fallback).not.toBeNull();
    expect(fallback?.getAttribute("data-shape")).toBe("circle");
    expect(fallback?.classList.contains("svadmin-avatar-shape--circle")).toBe(true);
  });

  it("renders square shape when shape is square", () => {
    const { container } = render(Avatar, {
      props: {
        fallback: "ORG",
        shape: "square",
      },
    });

    const fallback = container.querySelector('[data-slot="avatar-fallback"]');
    expect(fallback).not.toBeNull();
    expect(fallback?.getAttribute("data-shape")).toBe("square");
    expect(fallback?.classList.contains("svadmin-avatar-shape--square")).toBe(true);
  });

  it("renders image avatar with square shape attribute", () => {
    const { container } = render(Avatar, {
      props: {
        src: "https://example.com/avatar.png",
        alt: "User",
        shape: "square",
      },
    });

    const avatarWrap = container.querySelector(".svadmin-avatar");
    expect(avatarWrap?.getAttribute("data-shape")).toBe("square");
    expect(avatarWrap?.classList.contains("svadmin-avatar-shape--square")).toBe(true);
  });
});
