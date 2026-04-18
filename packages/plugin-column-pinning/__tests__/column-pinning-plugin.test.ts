import { describe, it, expect } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createColumnPinningPlugin, calculatePinOffsets } from '../src/column-pinning-plugin';
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
];

const columns: ColumnDef<Item>[] = [
  { id: 'id', accessor: 'id', header: 'ID', width: 60, pin: 'left' },
  { id: 'name', accessor: 'name', header: 'Name', width: 120, pin: 'left' },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'city', accessor: 'city', header: 'City' },
];

function createTrellis(extraColumns?: ColumnDef<Item>[]) {
  const cols = extraColumns ?? columns;
  return new Trellis<Item>({
    data,
    columns: cols,
    rowId: 'id',
    plugins: [createColumnPinningPlugin()],
  });
}

describe('createColumnPinningPlugin', () => {
  it('has correct plugin name', () => {
    const plugin = createColumnPinningPlugin();
    expect(plugin.name).toBe('column-pinning');
  });

  it('initializes columnPinning from ColumnDef.pin on install', () => {
    const trellis = createTrellis();
    const state = trellis.api.getState();

    expect(state.columnPinning.left).toEqual(['id', 'name']);
    expect(state.columnPinning.right).toEqual([]);
  });

  it('reads right pin from ColumnDef', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'id', accessor: 'id', header: 'ID', width: 60, pin: 'left' },
      { id: 'name', accessor: 'name', header: 'Name' },
      { id: 'email', accessor: 'email', header: 'Email' },
      { id: 'actions', accessor: 'id', header: 'Actions', width: 100, pin: 'right' },
    ];
    const trellis = createTrellis(cols);
    const state = trellis.api.getState();

    expect(state.columnPinning.left).toEqual(['id']);
    expect(state.columnPinning.right).toEqual(['actions']);
  });

  it('defaults to empty arrays when no pin columns', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'id', accessor: 'id', header: 'ID' },
      { id: 'name', accessor: 'name', header: 'Name' },
    ];
    const trellis = createTrellis(cols);
    const state = trellis.api.getState();

    expect(state.columnPinning.left).toEqual([]);
    expect(state.columnPinning.right).toEqual([]);
  });
});

describe('column-pin:toggle', () => {
  it('adds column to left list', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'id', accessor: 'id', header: 'ID' },
      { id: 'name', accessor: 'name', header: 'Name' },
    ];
    const trellis = createTrellis(cols);

    trellis.api.emit('column-pin:toggle', { columnId: 'id', side: 'left' as const });
    expect(trellis.api.getState().columnPinning.left).toEqual(['id']);
  });

  it('removes column from left list', () => {
    const trellis = createTrellis();
    trellis.api.emit('column-pin:toggle', { columnId: 'id', side: 'left' as const });
    expect(trellis.api.getState().columnPinning.left).toEqual(['name']);
  });

  it('toggles between add and remove', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'id', accessor: 'id', header: 'ID' },
      { id: 'name', accessor: 'name', header: 'Name' },
    ];
    const trellis = createTrellis(cols);

    trellis.api.emit('column-pin:toggle', { columnId: 'id', side: 'left' as const });
    expect(trellis.api.getState().columnPinning.left).toEqual(['id']);

    trellis.api.emit('column-pin:toggle', { columnId: 'id', side: 'left' as const });
    expect(trellis.api.getState().columnPinning.left).toEqual([]);
  });
});

describe('column-pin:set / column-pin:clear', () => {
  it('sets pin lists via column-pin:set', () => {
    const trellis = createTrellis();
    trellis.api.emit('column-pin:set', {
      left: ['email'],
      right: ['city'],
    });

    const state = trellis.api.getState();
    expect(state.columnPinning.left).toEqual(['email']);
    expect(state.columnPinning.right).toEqual(['city']);
  });

  it('clears all pins via column-pin:clear', () => {
    const trellis = createTrellis();
    trellis.api.emit('column-pin:clear', null);

    const state = trellis.api.getState();
    expect(state.columnPinning.left).toEqual([]);
    expect(state.columnPinning.right).toEqual([]);
  });
});

describe('calculatePinOffsets', () => {
  it('calculates left offsets based on preceding pinned column widths', () => {
    const plugin = createColumnPinningPlugin();
    const trellis = createTrellis();
    const state = trellis.api.getState();

    const offsets = plugin.getPinOffsets(state);

    // id (width=60, first left) → offset=0, isLastLeft=false
    const idOffset = offsets.get('id')!;
    expect(idOffset.side).toBe('left');
    expect(idOffset.offset).toBe(0);
    expect(idOffset.isLastLeft).toBe(false);

    // name (width=120, second left) → offset=60, isLastLeft=true
    const nameOffset = offsets.get('name')!;
    expect(nameOffset.side).toBe('left');
    expect(nameOffset.offset).toBe(60);
    expect(nameOffset.isLastLeft).toBe(true);
  });

  it('calculates right offsets from right to left accumulation', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'id', accessor: 'id', header: 'ID' },
      { id: 'name', accessor: 'name', header: 'Name' },
      { id: 'email', accessor: 'email', header: 'Email', width: 200, pin: 'right' },
    ];
    const plugin = createColumnPinningPlugin();
    const trellis = createTrellis(cols);
    const state = trellis.api.getState();

    const offsets = plugin.getPinOffsets(state);

    // email (only right pin) → offset=0, isFirstRight=true
    const emailOffset = offsets.get('email')!;
    expect(emailOffset.side).toBe('right');
    expect(emailOffset.offset).toBe(0);
    expect(emailOffset.isFirstRight).toBe(true);
  });

  it('handles multiple right pinned columns', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'id', accessor: 'id', header: 'ID' },
      { id: 'edit', accessor: 'id', header: 'Edit', width: 80, pin: 'right' },
      { id: 'delete', accessor: 'id', header: 'Delete', width: 80, pin: 'right' },
    ];
    const plugin = createColumnPinningPlugin();
    const trellis = createTrellis(cols);
    const state = trellis.api.getState();

    const offsets = plugin.getPinOffsets(state);

    // delete (last in list) → offset=0
    // edit (first in list, has delete after) → offset=80
    const editOffset = offsets.get('edit')!;
    expect(editOffset.offset).toBe(80);
    expect(editOffset.isFirstRight).toBe(true);

    const deleteOffset = offsets.get('delete')!;
    expect(deleteOffset.offset).toBe(0);
    expect(deleteOffset.isFirstRight).toBe(false);
  });

  it('excludes hidden columns from offset calculation', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'id', accessor: 'id', header: 'ID', width: 60, pin: 'left' },
      { id: 'name', accessor: 'name', header: 'Name', width: 120, pin: 'left' },
      { id: 'email', accessor: 'email', header: 'Email' },
    ];
    const plugin = createColumnPinningPlugin();
    const trellis = createTrellis(cols);

    // Hide 'id' column
    trellis.api.setState(() => ({
      columnVisibility: { id: false },
    }));

    const state = trellis.api.getState();
    const offsets = plugin.getPinOffsets(state);

    // name should now have offset=0 since id is hidden
    const nameOffset = offsets.get('name')!;
    expect(nameOffset.offset).toBe(0);
  });

  it('returns empty map when no pins', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'id', accessor: 'id', header: 'ID' },
      { id: 'name', accessor: 'name', header: 'Name' },
    ];
    const offsets = calculatePinOffsets(cols, { left: [], right: [] }, {});
    expect(offsets.size).toBe(0);
  });
});

describe('plugin destroy', () => {
  it('removes event listeners on destroy', () => {
    const trellis = createTrellis();
    trellis.destroy();

    // After destroy, emitting events should not throw
    expect(() => {
      trellis.api.emit('column-pin:toggle', { columnId: 'id', side: 'left' });
    }).not.toThrow();
  });
});
