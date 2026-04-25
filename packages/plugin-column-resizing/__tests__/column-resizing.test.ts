import { describe, it, expect } from 'vitest';
import { Trellis } from '@trellisjs/core';
import type { ColumnDef } from '@trellisjs/core';
import { createColumnResizingPlugin, clampWidth } from '../src/column-resizing-plugin';

interface Row {
  id: number;
  name: string;
  email: string;
}

const columns: ColumnDef<Row>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'email', accessor: 'email', header: 'Email' },
];

const data: Row[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

function createTable(options?: { minWidth?: number; maxWidth?: number; defaultWidth?: number }) {
  return new Trellis<Row>({
    data,
    columns,
    plugins: [createColumnResizingPlugin(options)],
    rowId: 'id',
  });
}

describe('createColumnResizingPlugin', () => {
  it('初始化 columnResizing 狀態（預設選項）', () => {
    const table = createTable();
    const state = table.api.getState();
    expect(state.columnResizing).toBeDefined();
    expect(state.columnResizing!.minWidth).toBe(50);
    expect(state.columnResizing!.defaultWidth).toBe(150);
    expect(state.columnResizing!.maxWidth).toBeUndefined();
    expect(state.columnResizing!.columnWidths).toEqual({});
    expect(state.columnResizing!.resizingColumn).toBeNull();
  });

  it('自訂選項', () => {
    const table = createTable({ minWidth: 80, maxWidth: 500, defaultWidth: 200 });
    const state = table.api.getState();
    expect(state.columnResizing!.minWidth).toBe(80);
    expect(state.columnResizing!.maxWidth).toBe(500);
    expect(state.columnResizing!.defaultWidth).toBe(200);
  });

  it('resize:column 更新欄寬', () => {
    const table = createTable();
    table.api.emit('resize:column', { columnId: 'name', width: 200 });
    const state = table.api.getState();
    expect(state.columnResizing!.columnWidths.name).toBe(200);
  });

  it('寬度不低於 minWidth', () => {
    const table = createTable({ minWidth: 50 });
    table.api.emit('resize:column', { columnId: 'name', width: 30 });
    expect(table.api.getState().columnResizing!.columnWidths.name).toBe(50);
  });

  it('寬度不超過 maxWidth', () => {
    const table = createTable({ maxWidth: 500 });
    table.api.emit('resize:column', { columnId: 'name', width: 600 });
    expect(table.api.getState().columnResizing!.columnWidths.name).toBe(500);
  });

  it('resize:start 設定 resizingColumn', () => {
    const table = createTable();
    table.api.emit('resize:start', { columnId: 'name' });
    expect(table.api.getState().columnResizing!.resizingColumn).toBe('name');
  });

  it('resize:end 清除 resizingColumn', () => {
    const table = createTable();
    table.api.emit('resize:start', { columnId: 'name' });
    table.api.emit('resize:end', undefined);
    expect(table.api.getState().columnResizing!.resizingColumn).toBeNull();
  });

  it('resize:reset 清空 columnWidths', () => {
    const table = createTable();
    table.api.emit('resize:column', { columnId: 'name', width: 200 });
    table.api.emit('resize:column', { columnId: 'email', width: 300 });
    table.api.emit('resize:reset', undefined);
    expect(table.api.getState().columnResizing!.columnWidths).toEqual({});
  });
});

describe('clampWidth', () => {
  it('正常寬度不變', () => {
    expect(clampWidth(100, 50, 500)).toBe(100);
  });

  it('低於 minWidth 時 clamp', () => {
    expect(clampWidth(30, 50, 500)).toBe(50);
  });

  it('超過 maxWidth 時 clamp', () => {
    expect(clampWidth(600, 50, 500)).toBe(500);
  });

  it('maxWidth undefined 時不限制上限', () => {
    expect(clampWidth(9999, 50, undefined)).toBe(9999);
  });
});
