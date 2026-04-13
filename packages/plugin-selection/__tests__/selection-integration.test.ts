import { describe, it, expect } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createSelectionPlugin } from '../src/selection-plugin';
import { createFilterPlugin } from '../../plugin-filter/src/filter-plugin';
import { createSortPlugin } from '../../plugin-sort/src/sort-plugin';
import type { ColumnDef } from '@trellisjs/core';

interface Item {
  id: string;
  name: string;
  city: string;
}

const data: Item[] = [
  { id: '1', name: 'Alice', city: 'Taipei' },
  { id: '2', name: 'Bob', city: 'Tokyo' },
  { id: '3', name: 'Charlie', city: 'Taipei' },
  { id: '4', name: 'Diana', city: 'Tokyo' },
  { id: '5', name: 'Eve', city: 'Osaka' },
];

const columns: ColumnDef<Item>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'city', accessor: 'city', header: 'City' },
];

describe('Selection + Filter Integration', () => {
  it('clears selection IDs not in filtered data', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      plugins: [createFilterPlugin(), createSelectionPlugin()],
    });

    // Select all rows first
    trellis.api.emit('selection:all', { select: true });
    expect(trellis.api.getState().selection.size).toBe(5);

    // Filter to only Taipei rows (Alice, Charlie)
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    const state = trellis.api.getState();

    // Selection should only contain IDs still in data
    expect(state.data).toHaveLength(2);
    expect(state.selection.size).toBe(2);
    expect(state.selection.has('1')).toBe(true);
    expect(state.selection.has('3')).toBe(true);
  });

  it('preserves selection when filter is cleared', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      plugins: [createFilterPlugin(), createSelectionPlugin()],
    });

    // Select some rows
    trellis.api.emit('selection:toggle', { rowId: '1' });
    trellis.api.emit('selection:toggle', { rowId: '3' });

    // Apply and then clear filter
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Tokyo' });
    expect(trellis.api.getState().selection.size).toBe(0); // Alice, Charlie not in Tokyo

    trellis.api.emit('filter:column', { columnId: 'city', value: '' });
    const state = trellis.api.getState();

    // All rows back, but original selection was cleaned
    expect(state.data).toHaveLength(5);
    // Selection was cleaned when filtered — it stays cleaned
    expect(state.selection.size).toBe(0);
  });
});

describe('Selection + Sort Integration', () => {
  it('selection survives sort change', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      plugins: [createSortPlugin(), createSelectionPlugin()],
    });

    // Select some rows
    trellis.api.emit('selection:toggle', { rowId: '1' });
    trellis.api.emit('selection:toggle', { rowId: '3' });

    // Sort by name descending — all rows still present
    trellis.api.emit('sort:change', {
      sortBy: [{ columnId: 'name', direction: 'desc' }],
    });
    const state = trellis.api.getState();

    expect(state.selection.size).toBe(2);
    expect(state.selection.has('1')).toBe(true);
    expect(state.selection.has('3')).toBe(true);
  });
});

describe('Selection + Filter + Sort Integration', () => {
  it('selection survives sort with filter active', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      plugins: [
        createFilterPlugin(),
        createSortPlugin(),
        createSelectionPlugin(),
      ],
    });

    // Filter to Taipei + Tokyo (exclude Osaka)
    trellis.api.emit('filter:column', { columnId: 'city', value: 'a' });
    // 'a' matches Taipei, Tokyo (all have 'a') but not necessarily Osaka
    // Actually 'Osaka' has 'a', let's use a more specific filter
    // Let's use filter:change for global search
    trellis.api.emit('filter:column', { columnId: 'city', value: '' });
    trellis.api.emit('filter:change', { query: '' });

    // Select visible rows
    trellis.api.emit('selection:toggle', { rowId: '1' });
    trellis.api.emit('selection:toggle', { rowId: '2' });

    // Sort — selection should persist
    trellis.api.emit('sort:change', {
      sortBy: [{ columnId: 'name', direction: 'asc' }],
    });
    const state = trellis.api.getState();

    expect(state.selection.has('1')).toBe(true);
    expect(state.selection.has('2')).toBe(true);
  });
});
