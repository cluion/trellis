import { describe, it, expect } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createColumnVisibilityPlugin } from '../src/column-visibility-plugin';
import type { ColumnDef } from '@trellisjs/core';

interface Item {
  name: string;
  category: string;
  price: number;
}

const data: Item[] = [
  { name: 'Apple', category: 'fruit', price: 1 },
  { name: 'Banana', category: 'fruit', price: 2 },
  { name: 'Carrot', category: 'vegetable', price: 3 },
];

const columns: ColumnDef<Item>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'category', accessor: 'category', header: 'Category' },
  { id: 'price', accessor: 'price', header: 'Price' },
];

describe('ColumnVisibilityPlugin', () => {
  it('initial columnVisibility is empty (all visible)', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createColumnVisibilityPlugin()],
    });

    const state = trellis.api.getState();
    expect(state.columnVisibility).toEqual({});
  });

  it('toggles a column to hidden', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createColumnVisibilityPlugin()],
    });

    trellis.api.emit('column:toggle', { columnId: 'age' });
    const state = trellis.api.getState();

    expect(state.columnVisibility.age).toBe(false);
  });

  it('toggles a hidden column back to visible', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createColumnVisibilityPlugin()],
    });

    trellis.api.emit('column:toggle', { columnId: 'price' });
    expect(trellis.api.getState().columnVisibility.price).toBe(false);

    trellis.api.emit('column:toggle', { columnId: 'price' });
    expect(trellis.api.getState().columnVisibility.price).toBe(true);
  });

  it('hides a column via column:hide', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createColumnVisibilityPlugin()],
    });

    trellis.api.emit('column:hide', { columnId: 'category' });
    const state = trellis.api.getState();

    expect(state.columnVisibility.category).toBe(false);
  });

  it('shows a hidden column via column:show', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createColumnVisibilityPlugin()],
    });

    trellis.api.emit('column:hide', { columnId: 'category' });
    expect(trellis.api.getState().columnVisibility.category).toBe(false);

    trellis.api.emit('column:show', { columnId: 'category' });
    expect(trellis.api.getState().columnVisibility.category).toBe(true);
  });

  it('column:hide is idempotent', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createColumnVisibilityPlugin()],
    });

    trellis.api.emit('column:hide', { columnId: 'name' });
    const state1 = trellis.api.getState();

    trellis.api.emit('column:hide', { columnId: 'name' });
    const state2 = trellis.api.getState();

    expect(state1.columnVisibility.name).toBe(false);
    expect(state2.columnVisibility.name).toBe(false);
  });

  it('column:show on visible column is no-op', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createColumnVisibilityPlugin()],
    });

    trellis.api.emit('column:show', { columnId: 'name' });
    const state = trellis.api.getState();

    // 沒被設定過，仍是空物件
    expect(state.columnVisibility).toEqual({});
  });

  it('multiple columns can be hidden independently', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createColumnVisibilityPlugin()],
    });

    trellis.api.emit('column:hide', { columnId: 'age' });
    trellis.api.emit('column:hide', { columnId: 'city' });

    const state = trellis.api.getState();
    expect(state.columnVisibility).toEqual({ age: false, city: false });
  });
});
