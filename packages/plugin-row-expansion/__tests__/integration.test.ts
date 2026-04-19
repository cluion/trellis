import { describe, it, expect } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createRowExpansionPlugin } from '../src/row-expansion-plugin';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import type { ColumnDef } from '@trellisjs/core';

interface Item {
  id: string;
  name: string;
  email: string;
  city: string;
}

const data: Item[] = [
  { id: '1', name: 'Alice', email: 'alice@test.com', city: 'Taipei' },
  { id: '2', name: 'Bob', email: 'bob@test.com', city: 'Tokyo' },
  { id: '3', name: 'Charlie', email: 'charlie@test.com', city: 'Osaka' },
  { id: '4', name: 'Diana', email: 'diana@test.com', city: 'Seoul' },
  { id: '5', name: 'Eve', email: 'eve@test.com', city: 'NYC' },
];

const columns: ColumnDef<Item>[] = [
  { id: 'id', accessor: 'id', header: 'ID' },
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'city', accessor: 'city', header: 'City' },
];

describe('Integration: expansion + sort', () => {
  it('expanded state follows row through sort', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      plugins: [
        createRowExpansionPlugin({ mode: 'multi' }),
        createSortPlugin(),
      ],
    });

    // Expand Alice (id: '1')
    trellis.api.emit('expansion:toggle', { rowId: '1' });
    expect(trellis.api.getState().expandedRows.has('1')).toBe(true);

    // Sort by name ascending — order becomes Alice, Bob, Charlie, Diana, Eve
    trellis.api.recompute({ sorting: { sortBy: [{ columnId: 'name', direction: 'asc' }] } });

    // Alice should still be expanded
    const state = trellis.api.getState();
    expect(state.expandedRows.has('1')).toBe(true);
    // Alice is still the first row after sorting by name
    expect(state.data[0].original.name).toBe('Alice');
  });
});

describe('Integration: expansion + filter', () => {
  it('cleans up expanded rows not in filtered data', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      plugins: [
        createRowExpansionPlugin({ mode: 'multi' }),
        createFilterPlugin(),
      ],
    });

    // Expand Alice and Bob
    trellis.api.emit('expansion:toggle', { rowId: '1' });
    trellis.api.emit('expansion:toggle', { rowId: '2' });
    expect(trellis.api.getState().expandedRows.size).toBe(2);

    // Filter for only 'Bob'
    trellis.api.recompute({ filtering: { query: 'Bob', columnFilters: {} } });

    // Alice should be cleaned up, Bob should remain
    const state = trellis.api.getState();
    expect(state.expandedRows.has('1')).toBe(false);
    expect(state.expandedRows.has('2')).toBe(true);
  });
});

describe('Integration: expansion + pagination', () => {
  it('cleans up expanded rows on page change', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      pageSize: 2,
      plugins: [
        createRowExpansionPlugin({ mode: 'multi' }),
        createPaginationPlugin(),
      ],
    });

    // Page 1 has Alice and Bob
    // Expand Alice
    trellis.api.emit('expansion:toggle', { rowId: '1' });
    expect(trellis.api.getState().expandedRows.has('1')).toBe(true);

    // Go to page 2 (Charlie, Diana)
    trellis.api.recompute({ pagination: { ...trellis.api.getState().pagination, page: 2 } });

    // Alice should be cleaned up since she's not on page 2
    const state = trellis.api.getState();
    expect(state.expandedRows.has('1')).toBe(false);
  });
});

describe('Integration: expansion + selection', () => {
  it('expansion and selection are independent', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      plugins: [
        createRowExpansionPlugin({ mode: 'multi' }),
      ],
    });

    // Expand Alice
    trellis.api.emit('expansion:toggle', { rowId: '1' });
    expect(trellis.api.getState().expandedRows.has('1')).toBe(true);

    // Selection should not be affected
    expect(trellis.api.getState().selection.size).toBe(0);

    // Select Bob
    trellis.api.setState((prev) => ({
      selection: new Set([...prev.selection, '2']),
    }));

    // Expansion should not be affected
    expect(trellis.api.getState().expandedRows.has('1')).toBe(true);
    expect(trellis.api.getState().selection.has('2')).toBe(true);
  });
});

describe('Integration: expansion + sort + filter + pagination', () => {
  it('all plugins work together', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      pageSize: 10,
      plugins: [
        createFilterPlugin(),
        createSortPlugin(),
        createPaginationPlugin(),
        createRowExpansionPlugin({ mode: 'multi' }),
      ],
    });

    // Expand Alice and Charlie
    trellis.api.emit('expansion:toggle', { rowId: '1' });
    trellis.api.emit('expansion:toggle', { rowId: '3' });
    expect(trellis.api.getState().expandedRows.has('1')).toBe(true);
    expect(trellis.api.getState().expandedRows.has('3')).toBe(true);

    // Sort by city ascending: NYC, Osaka, Seoul, Taipei, Tokyo
    trellis.api.recompute({ sorting: { sortBy: [{ columnId: 'city', direction: 'asc' }] } });

    // Both should still be expanded (all data still visible)
    expect(trellis.api.getState().expandedRows.has('1')).toBe(true);
    expect(trellis.api.getState().expandedRows.has('3')).toBe(true);

    // Filter for 'Osaka' — only Charlie matches
    trellis.api.recompute({ filtering: { query: 'Osaka', columnFilters: {} } });

    // Alice removed (not in filtered results), Charlie stays
    const state = trellis.api.getState();
    expect(state.expandedRows.has('1')).toBe(false);
    expect(state.expandedRows.has('3')).toBe(true);
  });
});
