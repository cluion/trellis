import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createSortPlugin } from '../src/sort-plugin';
import type { ColumnDef } from '@trellisjs/core';

interface Item {
  name: string;
  count: number;
  date: string;
}

const data: Item[] = [
  { name: 'Charlie', count: 30, date: '2024-03-15' },
  { name: 'Alice', count: 10, date: '2024-01-01' },
  { name: 'Bob', count: 20, date: '2024-02-10' },
];

const columns: ColumnDef<Item>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'count', accessor: 'count', header: 'Count' },
  { id: 'date', accessor: 'date', header: 'Date' },
];

describe('SortPlugin', () => {
  it('sorts strings ascending', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'name', direction: 'asc' });
    const state = trellis.api.getState();

    expect(state.data[0].original.name).toBe('Alice');
    expect(state.data[1].original.name).toBe('Bob');
    expect(state.data[2].original.name).toBe('Charlie');
  });

  it('sorts strings descending', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'name', direction: 'desc' });
    const state = trellis.api.getState();

    expect(state.data[0].original.name).toBe('Charlie');
    expect(state.data[2].original.name).toBe('Alice');
  });

  it('sorts numbers correctly', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'count', direction: 'asc' });
    const state = trellis.api.getState();

    expect(state.data[0].original.count).toBe(10);
    expect(state.data[1].original.count).toBe(20);
    expect(state.data[2].original.count).toBe(30);
  });

  it('sorts date strings correctly', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'date', direction: 'asc' });
    const state = trellis.api.getState();

    expect(state.data[0].original.date).toBe('2024-01-01');
    expect(state.data[2].original.date).toBe('2024-03-15');
  });

  it('updates sorting state in TableState', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'name', direction: 'desc' });
    const state = trellis.api.getState();

    expect(state.sorting.columnId).toBe('name');
    expect(state.sorting.direction).toBe('desc');
  });

  it('respects custom sortFn on column', () => {
    const customColumns: ColumnDef<Item>[] = [
      {
        id: 'name',
        accessor: 'name',
        header: 'Name',
        sortFn: (a, b) => String(b).length - String(a).length,
      },
    ];

    const trellis = new Trellis<Item>({
      data,
      columns: customColumns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'name', direction: 'asc' });
    const state = trellis.api.getState();

    // Charlie (7) > Alice (5) > Bob (3) — 依長度遞減
    expect(state.data[0].original.name).toBe('Charlie');
  });

  it('clears sort when direction is null', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'name', direction: 'asc' });
    trellis.api.emit('sort:change', { columnId: 'name', direction: null });

    const state = trellis.api.getState();
    expect(state.sorting.direction).toBeNull();
    // 應恢復原始順序
    expect(state.data[0].original.name).toBe('Charlie');
  });

  it('respects sortable: false on column', () => {
    const restrictedColumns: ColumnDef<Item>[] = [
      { id: 'name', accessor: 'name', header: 'Name', sortable: false },
      { id: 'count', accessor: 'count', header: 'Count' },
    ];

    const trellis = new Trellis<Item>({
      data,
      columns: restrictedColumns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'name', direction: 'asc' });
    const state = trellis.api.getState();

    // 不應排序 — 欄位不可排序
    expect(state.sorting.direction).toBeNull();
    expect(state.data[0].original.name).toBe('Charlie');
  });
});
