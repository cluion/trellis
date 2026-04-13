import { describe, it, expect } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createSelectionPlugin } from '../src/selection-plugin';
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

function createTrellis() {
  return new Trellis<Item>({
    data,
    columns,
    rowId: 'id',
    plugins: [createSelectionPlugin()],
  });
}

describe('Selection Plugin', () => {
  describe('selection:toggle', () => {
    it('selects an unselected row', () => {
      const trellis = createTrellis();

      trellis.api.emit('selection:toggle', { rowId: '3' });
      const state = trellis.api.getState();

      expect(state.selection.has('3')).toBe(true);
      expect(state.selection.size).toBe(1);
    });

    it('deselects a selected row', () => {
      const trellis = createTrellis();

      trellis.api.emit('selection:toggle', { rowId: '3' });
      trellis.api.emit('selection:toggle', { rowId: '3' });
      const state = trellis.api.getState();

      expect(state.selection.has('3')).toBe(false);
      expect(state.selection.size).toBe(0);
    });

    it('supports selecting multiple rows', () => {
      const trellis = createTrellis();

      trellis.api.emit('selection:toggle', { rowId: '1' });
      trellis.api.emit('selection:toggle', { rowId: '3' });
      trellis.api.emit('selection:toggle', { rowId: '5' });
      const state = trellis.api.getState();

      expect(state.selection.size).toBe(3);
      expect(state.selection.has('1')).toBe(true);
      expect(state.selection.has('3')).toBe(true);
      expect(state.selection.has('5')).toBe(true);
    });
  });

  describe('selection:all', () => {
    it('selects all rows in current data', () => {
      const trellis = createTrellis();

      trellis.api.emit('selection:all', { select: true });
      const state = trellis.api.getState();

      expect(state.selection.size).toBe(5);
      expect(state.data.every((row) => state.selection.has(row.id))).toBe(true);
    });

    it('deselects all rows', () => {
      const trellis = createTrellis();

      trellis.api.emit('selection:all', { select: true });
      expect(trellis.api.getState().selection.size).toBe(5);

      trellis.api.emit('selection:all', { select: false });
      const state = trellis.api.getState();

      expect(state.selection.size).toBe(0);
    });
  });

  describe('selection:range', () => {
    it('selects range downward (anchor to toIndex)', () => {
      const trellis = createTrellis();

      // Toggle row at index 1 to set anchor
      trellis.api.emit('selection:toggle', { rowId: '2' });
      // Range select to index 4
      trellis.api.emit('selection:range', { toIndex: 4 });
      const state = trellis.api.getState();

      // Should select indices 1-4: Bob, Charlie, Diana, Eve
      expect(state.selection.has('2')).toBe(true);
      expect(state.selection.has('3')).toBe(true);
      expect(state.selection.has('4')).toBe(true);
      expect(state.selection.has('5')).toBe(true);
    });

    it('selects range upward (toIndex to anchor)', () => {
      const trellis = createTrellis();

      // Toggle row at index 4 to set anchor
      trellis.api.emit('selection:toggle', { rowId: '5' });
      // Range select to index 1
      trellis.api.emit('selection:range', { toIndex: 1 });
      const state = trellis.api.getState();

      // Should select indices 1-4: Bob, Charlie, Diana, Eve
      expect(state.selection.has('2')).toBe(true);
      expect(state.selection.has('3')).toBe(true);
      expect(state.selection.has('4')).toBe(true);
      expect(state.selection.has('5')).toBe(true);
    });

    it('selects single row when no anchor exists', () => {
      const trellis = createTrellis();

      // No prior toggle — range selects just the target index
      trellis.api.emit('selection:range', { toIndex: 2 });
      const state = trellis.api.getState();

      expect(state.selection.size).toBe(1);
      expect(state.selection.has('3')).toBe(true);
    });

    it('range selection replaces to exactly anchor-toIndex', () => {
      const trellis = createTrellis();

      // Manually select row at index 0 and 3
      trellis.api.emit('selection:toggle', { rowId: '1' });
      trellis.api.emit('selection:toggle', { rowId: '4' });

      // Range from anchor (index 3) to index 4 — should only have 3-4
      trellis.api.emit('selection:range', { toIndex: 4 });
      const state = trellis.api.getState();

      // Row 1 (index 0) should be deselected; only range 3-4
      expect(state.selection.has('1')).toBe(false);
      expect(state.selection.has('4')).toBe(true);
      expect(state.selection.has('5')).toBe(true);
    });
  });
});
