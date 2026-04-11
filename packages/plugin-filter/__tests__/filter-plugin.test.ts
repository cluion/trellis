import { describe, it, expect } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createFilterPlugin } from '../src/filter-plugin';
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
  { name: 'Daikon', category: 'vegetable', price: 4 },
];

const columns: ColumnDef<Item>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'category', accessor: 'category', header: 'Category' },
  { id: 'price', accessor: 'price', header: 'Price' },
];

describe('FilterPlugin', () => {
  it('filters rows by global search query', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:change', { query: 'app' });
    const state = trellis.api.getState();

    expect(state.data).toHaveLength(1);
    expect(state.data[0].original.name).toBe('Apple');
  });

  it('filter is case-insensitive', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:change', { query: 'BANANA' });
    const state = trellis.api.getState();

    expect(state.data).toHaveLength(1);
    expect(state.data[0].original.name).toBe('Banana');
  });

  it('searches across all columns', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:change', { query: 'vegetable' });
    const state = trellis.api.getState();

    expect(state.data).toHaveLength(2);
  });

  it('also searches numeric values as strings', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:change', { query: '4' });
    const state = trellis.api.getState();

    expect(state.data).toHaveLength(1);
    expect(state.data[0].original.name).toBe('Daikon');
  });

  it('clears filter when query is empty', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:change', { query: 'fruit' });
    expect(trellis.api.getState().data).toHaveLength(2);

    trellis.api.emit('filter:change', { query: '' });
    expect(trellis.api.getState().data).toHaveLength(4);
  });

  it('updates filtering state in TableState', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:change', { query: 'carrot' });
    const state = trellis.api.getState();

    expect(state.filtering.query).toBe('carrot');
  });

  it('returns all rows when no filter is active', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    expect(trellis.api.getState().data).toHaveLength(4);
  });
});
