import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import QRCode from "./QRCode.svelte";

describe("QRCode status overlay enhancements", () => {
  it("renders loading status with spinner overlay", () => {
    const { container } = render(QRCode, {
      value: "https://example.com/login",
      status: "loading",
      statusText: "加载中...",
    });

    const mask = container.querySelector('[data-slot="qr-code-mask"]');
    expect(mask).not.toBeNull();
    expect(mask?.getAttribute("data-status")).toBe("loading");
    expect(container.textContent).toContain("加载中...");
  });

  it("renders expired status with refresh button and triggers onrefresh", async () => {
    const onrefresh = vi.fn();
    const { container, getByRole } = render(QRCode, {
      value: "https://example.com/login",
      status: "expired",
      onrefresh,
    });

    const mask = container.querySelector('[data-slot="qr-code-mask"]');
    expect(mask).not.toBeNull();
    expect(mask?.getAttribute("data-status")).toBe("expired");
    expect(container.textContent).toContain("二维码已失效");

    const refreshBtn = getByRole("button", { name: "Refresh QR code" });
    await fireEvent.click(refreshBtn);
    expect(onrefresh).toHaveBeenCalled();
  });

  it("renders scanned status with success message", () => {
    const { container } = render(QRCode, {
      value: "https://example.com/login",
      status: "scanned",
      statusText: "扫码成功",
    });

    const mask = container.querySelector('[data-slot="qr-code-mask"]');
    expect(mask).not.toBeNull();
    expect(mask?.getAttribute("data-status")).toBe("scanned");
    expect(container.textContent).toContain("扫码成功");
  });
});
