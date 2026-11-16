import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import TableToolbar from "./TableToolbar.svelte";
import type { ColumnItem } from "./ColumnSettings.svelte";

describe("TableToolbar Component", () => {
  const sampleColumns: ColumnItem[] = [
    { key: "id", label: "ID", visible: true, required: true },
    { key: "name", label: "姓名", visible: true },
    { key: "status", label: "状态", visible: true },
  ];

  it("renders title, description and tool actions", () => {
    const { container } = render(TableToolbar, {
      props: {
        title: "用户列表",
        description: "展示系统授权用户数据",
        columns: sampleColumns,
      },
    });

    const root = container.querySelector('[data-svadmin-component="TableToolbar"]');
    expect(root).not.toBeNull();
    expect(container.textContent).toContain("用户列表");
    expect(container.textContent).toContain("展示系统授权用户数据");
  });

  it("triggers refresh callback on click", async () => {
    const onrefresh = vi.fn();
    const { getByLabelText } = render(TableToolbar, {
      props: {
        onrefresh,
      },
    });

    const refreshBtn = getByLabelText("Refresh");
    await fireEvent.click(refreshBtn);
    expect(onrefresh).toHaveBeenCalledTimes(1);
  });

  it("toggles density between default and compact", async () => {
    const ondensitychange = vi.fn();
    const { getByLabelText } = render(TableToolbar, {
      props: {
        density: "default",
        ondensitychange,
      },
    });

    const densityBtn = getByLabelText("Toggle density");
    await fireEvent.click(densityBtn);
    expect(ondensitychange).toHaveBeenCalledWith("compact");
  });
});
