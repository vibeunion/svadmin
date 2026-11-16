import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import OtpInput from "./OtpInput.svelte";

describe("OtpInput Separator Enhancements", () => {
  it("renders separator between 3-digit groups", () => {
    const { container } = render(OtpInput, {
      props: {
        length: 6,
        separator: "-",
      },
    });

    const separators = container.querySelectorAll(".svadmin-otp-separator");
    expect(separators.length).toBeGreaterThan(0);
    expect(separators[0]?.textContent).toBe("-");
  });
});
