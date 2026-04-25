import { describe, it, expect } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { createColumnVisibilityPlugin } from '@trellisjs/plugin-column-visibility';
import { createColumnResizingPlugin } from '../src/column-resizing-plugin';
import type { ColumnDef } from '@trellisjs/core';

interface Row {
  id: number;
  name: string;
  email: string;
  age: number;
}

const columns: ColumnDef<Row>[] = [
  { id: 'name', accessor: 'name', header: 'Name', sortable: true },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'age', accessor: 'age', header: 'Age' },
];

const data: Row[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 },
  { id: 2, name: 'Bob', email: 'bob@example.com', age: 25 },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', age: 35 },
];

describe('Column Resizing 跨插件整合', () => {
  it('調整欄寬後排序 → 欄寬保持不變', () => {
    const table = new Trellis<Row>({
      data,
      columns,
      plugins: [createColumnResizingPlugin(), createSortPlugin()],
      rowId: 'id',
    });

    // 調整欄寬
    table.api.emit('resize:column', { columnId: 'name', width: 200 });
    expect(table.api.getState().columnResizing!.columnWidths.name).toBe(200);

    // 排序
    table.api.emit('sort:toggle', { columnId: 'name' });

    // 欄寬保持
    expect(table.api.getState().columnResizing!.columnWidths.name).toBe(200);
  });

  it('調整欄寬後切換分頁 → 欄寬保持不變', () => {
    const table = new Trellis<Row>({
      data,
      columns,
      plugins: [createColumnResizingPlugin(), createPaginationPlugin()],
      rowId: 'id',
      pageSize: 2,
    });

    // 調整欄寬
    table.api.emit('resize:column', { columnId: 'name', width: 250 });
    expect(table.api.getState().columnResizing!.columnWidths.name).toBe(250);

    // 切到第二頁
    table.api.emit('pagination:change', { page: 2 });

    // 欄寬保持
    expect(table.api.getState().columnResizing!.columnWidths.name).toBe(250);
  });

  it('搭配 column-visibility 隱藏/顯示欄 → 顯示後寬度正確', () => {
    const table = new Trellis<Row>({
      data,
      columns,
      plugins: [createColumnResizingPlugin(), createColumnVisibilityPlugin()],
      rowId: 'id',
    });

    // 調整欄寬
    table.api.emit('resize:column', { columnId: 'email', width: 300 });

    // 隱藏欄位
    table.api.emit('column:hide', { columnId: 'email' });
    expect(table.api.getState().columnVisibility.email).toBe(false);

    // 欄寬仍保留在狀態中
    expect(table.api.getState().columnResizing!.columnWidths.email).toBe(300);

    // 顯示欄位
    table.api.emit('column:show', { columnId: 'email' });
    expect(table.api.getState().columnVisibility.email).toBe(true);

    // 欄寬保持正確
    expect(table.api.getState().columnResizing!.columnWidths.email).toBe(300);
  });
});
