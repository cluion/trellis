import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createRowExpansionPlugin } from '../src/row-expansion-plugin';
import type { ColumnDef } from '@trellisjs/core';

interface Item {
  id: string;
  name: string;
  email: string;
}

const data: Item[] = [
  { id: '1', name: 'Alice', email: 'alice@test.com' },
  { id: '2', name: 'Bob', email: 'bob@test.com' },
  { id: '3', name: 'Charlie', email: 'charlie@test.com' },
];

const columns: ColumnDef<Item>[] = [
  { id: 'id', accessor: 'id', header: 'ID' },
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'email', accessor: 'email', header: 'Email' },
];

function createTrellis(mode?: 'single' | 'multi') {
  return new Trellis<Item>({
    data,
    columns,
    rowId: 'id',
    plugins: [createRowExpansionPlugin(mode ? { mode } : undefined)],
  });
}

// --- Task 2.1: createRowExpansionPlugin factory tests ---

describe('createRowExpansionPlugin', () => {
  it('has correct plugin name', () => {
    const plugin = createRowExpansionPlugin();
    expect(plugin.name).toBe('row-expansion');
  });

  it('defaults to single mode', () => {
    const trellis = createTrellis();
    const state = trellis.api.getState();
    expect(state.expandedRows).toBeInstanceOf(Set);
    expect(state.expandedRows.size).toBe(0);
  });

  it('initializes expandedRows as empty Set in multi mode', () => {
    const trellis = createTrellis('multi');
    const state = trellis.api.getState();
    expect(state.expandedRows).toBeInstanceOf(Set);
    expect(state.expandedRows.size).toBe(0);
  });
});

// --- Task 2.3: expansion:toggle tests ---

describe('expansion:toggle', () => {
  it('toggles row expansion in multi mode', () => {
    const trellis = createTrellis('multi');

    trellis.api.emit('expansion:toggle', { rowId: '1' });
    expect(trellis.api.getState().expandedRows.has('1')).toBe(true);

    trellis.api.emit('expansion:toggle', { rowId: '1' });
    expect(trellis.api.getState().expandedRows.has('1')).toBe(false);
  });

  it('in single mode collapses other rows when expanding', () => {
    const trellis = createTrellis('single');

    trellis.api.emit('expansion:toggle', { rowId: '1' });
    expect(trellis.api.getState().expandedRows.has('1')).toBe(true);

    trellis.api.emit('expansion:toggle', { rowId: '2' });
    const state = trellis.api.getState();
    expect(state.expandedRows.has('1')).toBe(false);
    expect(state.expandedRows.has('2')).toBe(true);
  });

  it('in single mode collapses current row on re-toggle', () => {
    const trellis = createTrellis('single');

    trellis.api.emit('expansion:toggle', { rowId: '1' });
    expect(trellis.api.getState().expandedRows.has('1')).toBe(true);

    trellis.api.emit('expansion:toggle', { rowId: '1' });
    expect(trellis.api.getState().expandedRows.has('1')).toBe(false);
  });

  it('in multi mode allows multiple rows expanded', () => {
    const trellis = createTrellis('multi');

    trellis.api.emit('expansion:toggle', { rowId: '1' });
    trellis.api.emit('expansion:toggle', { rowId: '2' });

    const state = trellis.api.getState();
    expect(state.expandedRows.has('1')).toBe(true);
    expect(state.expandedRows.has('2')).toBe(true);
    expect(state.expandedRows.size).toBe(2);
  });
});

// --- Task 2.5: expansion:expand / expansion:collapse tests ---

describe('expansion:expand / expansion:collapse', () => {
  it('expands a specific row', () => {
    const trellis = createTrellis('multi');

    trellis.api.emit('expansion:expand', { rowId: '1' });
    expect(trellis.api.getState().expandedRows.has('1')).toBe(true);
  });

  it('collapses a specific row', () => {
    const trellis = createTrellis('multi');

    trellis.api.emit('expansion:expand', { rowId: '1' });
    trellis.api.emit('expansion:collapse', { rowId: '1' });
    expect(trellis.api.getState().expandedRows.has('1')).toBe(false);
  });

  it('expand in single mode collapses others', () => {
    const trellis = createTrellis('single');

    trellis.api.emit('expansion:expand', { rowId: '1' });
    trellis.api.emit('expansion:expand', { rowId: '2' });

    const state = trellis.api.getState();
    expect(state.expandedRows.has('1')).toBe(false);
    expect(state.expandedRows.has('2')).toBe(true);
  });
});

// --- Task 2.7: expansion:expandAll / expansion:collapseAll tests ---

describe('expansion:expandAll / expansion:collapseAll', () => {
  it('expandAll in multi mode expands all rows', () => {
    const trellis = createTrellis('multi');

    trellis.api.emit('expansion:expandAll', null);
    const state = trellis.api.getState();
    expect(state.expandedRows.has('1')).toBe(true);
    expect(state.expandedRows.has('2')).toBe(true);
    expect(state.expandedRows.has('3')).toBe(true);
  });

  it('expandAll in single mode is ignored', () => {
    const trellis = createTrellis('single');

    trellis.api.emit('expansion:expandAll', null);
    expect(trellis.api.getState().expandedRows.size).toBe(0);
  });

  it('collapseAll clears all expanded rows', () => {
    const trellis = createTrellis('multi');

    trellis.api.emit('expansion:expand', { rowId: '1' });
    trellis.api.emit('expansion:expand', { rowId: '2' });
    expect(trellis.api.getState().expandedRows.size).toBe(2);

    trellis.api.emit('expansion:collapseAll', null);
    expect(trellis.api.getState().expandedRows.size).toBe(0);
  });
});

// --- Task 2.9: data change cleanup tests ---

describe('data change cleanup', () => {
  it('removes expanded rows not in current data after filter', () => {
    const trellis = createTrellis('multi');

    trellis.api.emit('expansion:expand', { rowId: '1' });
    trellis.api.emit('expansion:expand', { rowId: '2' });
    expect(trellis.api.getState().expandedRows.size).toBe(2);

    // Simulate filter removing row '1' from data
    trellis.api.setState((prev) => ({
      data: prev.data.filter((row) => row.id !== '1'),
    }));

    // Row '1' should be cleaned up
    const state = trellis.api.getState();
    expect(state.expandedRows.has('1')).toBe(false);
    expect(state.expandedRows.has('2')).toBe(true);
  });

  it('preserves expanded rows that are still in data', () => {
    const trellis = createTrellis('multi');

    trellis.api.emit('expansion:expand', { rowId: '2' });

    // Change data but keep row '2'
    trellis.api.setState((prev) => ({
      data: [...prev.data],
    }));

    expect(trellis.api.getState().expandedRows.has('2')).toBe(true);
  });
});

// --- Task 2.11: plugin destroy tests ---

describe('plugin destroy', () => {
  it('removes event listeners on destroy', () => {
    const trellis = createTrellis();
    trellis.destroy();

    // After destroy, emitting events should not throw
    expect(() => {
      trellis.api.emit('expansion:toggle', { rowId: '1' });
    }).not.toThrow();
  });
});
