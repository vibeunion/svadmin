import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/svelte";
import PopconfirmHarness from "../../test/fixtures/PopconfirmHarness.svelte";

describe("Popconfirm Component", () => {
  it("renders trigger and displays confirmation popover on click", async () => {
    const onConfirm = vi.fn();
    const { getByRole, queryByText } = render(PopconfirmHarness, {
      props: {
        title: "确定删除此记录？",
        okText: "确认删除",
        cancelText: "点错了",
        okType: "danger",
        onConfirm,
      },
    });

    const trigger = getByRole("button", { name: "删除数据" });
    expect(trigger).toBeDefined();

    // Popover is not open initially
    expect(queryByText("确定删除此记录？")).toBeNull();

    // Click trigger to open
    await fireEvent.click(trigger);

    expect(screen.getByText("确定删除此记录？")).toBeDefined();
    expect(document.querySelector(".svadmin-popconfirm")?.getAttribute("data-confirm-weight")).toBe("light");
    const okBtn = screen.getByRole("button", { name: "确认删除" });
    expect(okBtn).toBeDefined();

    // Click cancel closes popover
    const cancelBtn = screen.getByRole("button", { name: "点错了" });
    await fireEvent.click(cancelBtn);
    expect(onConfirm).not.toHaveBeenCalled();

    // Click trigger again and confirm
    await fireEvent.click(trigger);
    const confirmBtn = screen.getByRole("button", { name: "确认删除" });
    await fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders an irreversible confirm as a dialog instead of a popover", async () => {
    const onConfirm = vi.fn();
    render(PopconfirmHarness, {
      props: {
        title: "删除这条记录？",
        okText: "删除记录",
        cancelText: "取消",
        okType: "danger",
        risk: "irreversible",
        onConfirm,
      },
    });

    await fireEvent.click(screen.getByRole("button", { name: "删除数据" }));
    expect(document.querySelector(".svadmin-popconfirm")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.querySelector("[data-confirm-weight='irreversible']")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "删除记录" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
