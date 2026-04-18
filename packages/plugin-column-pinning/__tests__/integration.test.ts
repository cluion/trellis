import { describe, it, expect } from 'vitest';
import { Trellis, calculatePinOffsets } from '@trellisjs/core';
import { createColumnPinningPlugin } from '../src/column-pinning-plugin';
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
];

const columns: ColumnDef<Item>[] = [
  { id: 'id', accessor: 'id', header: 'ID', width: 60, pin: 'left' },
  { id: 'name', accessor: 'name', header: 'Name', width: 120, pin: 'left' },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'city', accessor: 'city', header: 'City' },
];

describe('Integration: column-pinning + column-visibility', () => {
  it('recalculates offsets when preceding pinned column is hidden', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      plugins: [createColumnPinningPlugin()],
    });

    // Initially: name offset = 60 (id's width)
    let state = trellis.api.getState();
    const plugin = createColumnPinningPlugin();
    // Use calculatePinOffsets directly since plugin instance is different
    let offsets = calculatePinOffsets(state.columns, state.columnPinning, state.columnVisibility);
    expect(offsets.get('name')!.offset).toBe(60);

    // Hide 'id' column
    trellis.api.setState(() => ({ columnVisibility: { id: false } }));
    state = trellis.api.getState();
    offsets = calculatePinOffsets(state.columns, state.columnPinning, state.columnVisibility);

    // name offset should now be 0 (id is hidden, its width excluded)
    expect(offsets.get('name')!.offset).toBe(0);
    // id should still be in the pin list but hidden
    expect(state.columnPinning.left).toEqual(['id', 'name']);
  });

  it('recalculates right offsets when following pinned column is hidden', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'id', accessor: 'id', header: 'ID' },
      { id: 'name', accessor: 'name', header: 'Name' },
      { id: 'edit', accessor: 'id', header: 'Edit', width: 80, pin: 'right' },
      { id: 'delete', accessor: 'id', header: 'Delete', width: 80, pin: 'right' },
    ];
    const trellis = new Trellis<Item>({
      data,
      columns: cols,
      rowId: 'id',
      plugins: [createColumnPinningPlugin()],
    });

    // edit is first right, delete is second right
    // delete offset=0, edit offset=80 (delete's width)
    let state = trellis.api.getState();
    let offsets = calculatePinOffsets(state.columns, state.columnPinning, state.columnVisibility);
    expect(offsets.get('edit')!.offset).toBe(80);

    // Hide 'delete' column
    trellis.api.setState(() => ({ columnVisibility: { delete: false } }));
    state = trellis.api.getState();
    offsets = calculatePinOffsets(state.columns, state.columnPinning, state.columnVisibility);

    // edit offset should now be 0 (delete is hidden)
    expect(offsets.get('edit')!.offset).toBe(0);
  });
});

describe('Integration: column-pinning + sort + filter', () => {
  it('pinning state is preserved after sort', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      plugins: [createColumnPinningPlugin()],
    });

    // Sort by name (manually update state to simulate sort)
    trellis.api.setState(() => ({
      sorting: { sortBy: [{ columnId: 'name', direction: 'asc' }] },
    }));

    const state = trellis.api.getState();
    expect(state.columnPinning.left).toEqual(['id', 'name']);
    expect(state.columnPinning.right).toEqual([]);
  });

  it('pinning state is preserved after filter', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      plugins: [createColumnPinningPlugin()],
    });

    trellis.api.setState(() => ({
      filtering: { query: 'Alice', columnFilters: {} },
    }));

    const state = trellis.api.getState();
    expect(state.columnPinning.left).toEqual(['id', 'name']);
    expect(state.columnPinning.right).toEqual([]);
  });
});

describe('Integration: column-pinning + selection', () => {
  it('pinned column data is accessible for selection', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      rowId: 'id',
      plugins: [createColumnPinningPlugin()],
    });

    // Verify pinned columns data is still in state
    const state = trellis.api.getState();
    expect(state.data).toHaveLength(3);
    expect(state.data[0].original.name).toBe('Alice');

    // Pinning state is intact
    expect(state.columnPinning.left).toEqual(['id', 'name']);
  });
});
