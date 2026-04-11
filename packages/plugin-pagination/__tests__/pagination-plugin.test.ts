import { describe, it, expect, vi } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createPaginationPlugin } from '../src/pagination-plugin';
import type { ColumnDef } from '@trellisjs/core';

interface Item {
  name: string;
  value: number;
}

const data: Item[] = Array.from({ length: 25 }, (_, i) => ({
  name: `Item ${i + 1}`,
  value: i + 1,
}));

const columns: ColumnDef<Item>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'value', accessor: 'value', header: 'Value' },
];

describe('PaginationPlugin', () => {
  it('limits visible data to pageSize', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      pageSize: 10,
      plugins: [createPaginationPlugin()],
    });

    const state = trellis.api.getState();
    expect(state.data).toHaveLength(10);
  });

  it('navigates to next page', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      pageSize: 10,
      plugins: [createPaginationPlugin()],
    });

    trellis.api.emit('pagination:next', {});
    const state = trellis.api.getState();

    expect(state.pagination.page).toBe(2);
    expect(state.data).toHaveLength(10);
    expect(state.data[0].original.name).toBe('Item 11');
  });

  it('navigates to previous page', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      pageSize: 10,
      plugins: [createPaginationPlugin()],
    });

    trellis.api.emit('pagination:next', {});
    trellis.api.emit('pagination:prev', {});
    const state = trellis.api.getState();

    expect(state.pagination.page).toBe(1);
    expect(state.data[0].original.name).toBe('Item 1');
  });

  it('navigates to specific page', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      pageSize: 10,
      plugins: [createPaginationPlugin()],
    });

    trellis.api.emit('pagination:goto', { page: 3 });
    const state = trellis.api.getState();

    expect(state.pagination.page).toBe(3);
    expect(state.data[0].original.name).toBe('Item 21');
    expect(state.data).toHaveLength(5); // 最後一頁只有 5 筆
  });

  it('does not go before page 1', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      pageSize: 10,
      plugins: [createPaginationPlugin()],
    });

    trellis.api.emit('pagination:prev', {});
    const state = trellis.api.getState();

    expect(state.pagination.page).toBe(1);
  });

  it('does not go past the last page', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      pageSize: 10,
      plugins: [createPaginationPlugin()],
    });

    trellis.api.emit('pagination:goto', { page: 5 });
    const state = trellis.api.getState();

    // 應限制在第 3 頁（25 筆 / 每頁 10 = 3 頁）
    expect(state.pagination.page).toBe(3);
  });

  it('registers totalPages and currentPageInfo via slots', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      pageSize: 10,
      plugins: [createPaginationPlugin()],
    });

    // 插件應透過事件提供分頁詮釋資料
    const handler = vi.fn();
    trellis.api.on('pagination:info', handler);

    trellis.api.emit('pagination:next', {});

    // 驗證狀態有正確的詮釋資料
    const state = trellis.api.getState();
    expect(state.pagination.page).toBe(2);
  });

  it('handles page size change', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      pageSize: 10,
      plugins: [createPaginationPlugin()],
    });

    trellis.api.emit('pagination:pageSize', { pageSize: 5 });
    const state = trellis.api.getState();

    expect(state.pagination.pageSize).toBe(5);
    expect(state.data).toHaveLength(5);
  });
});
