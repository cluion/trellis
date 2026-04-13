import { describe, it, expect } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createFilterPlugin } from '../src/filter-plugin';
import type { ColumnDef } from '@trellisjs/core';

interface Item {
  name: string;
  city: string;
  category: string;
}

const data: Item[] = [
  { name: 'Alice', city: 'Taipei', category: 'fruit' },
  { name: 'Bob', city: 'Tokyo', category: 'fruit' },
  { name: 'Charlie', city: 'Taipei', category: 'vegetable' },
  { name: 'Diana', city: 'Tokyo', category: 'vegetable' },
];

const columns: ColumnDef<Item>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'city', accessor: 'city', header: 'City' },
  { id: 'category', accessor: 'category', header: 'Category' },
];

describe('Column Filter', () => {
  it('filters rows by single column', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    const state = trellis.api.getState();

    expect(state.data).toHaveLength(2);
    expect(state.data.map((r) => r.original.name)).toEqual([
      'Alice',
      'Charlie',
    ]);
  });

  it('stores columnFilters in state', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:column', { columnId: 'city', value: 'Tokyo' });
    const state = trellis.api.getState();

    expect(state.filtering.columnFilters).toEqual({ city: 'Tokyo' });
  });

  it('clears column filter when value is empty', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    expect(trellis.api.getState().data).toHaveLength(2);

    trellis.api.emit('filter:column', { columnId: 'city', value: '' });
    const state = trellis.api.getState();

    expect(state.data).toHaveLength(4);
    expect(state.filtering.columnFilters).toEqual({});
  });

  it('supports multiple column filters simultaneously', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:column', { columnId: 'city', value: 'Tokyo' });
    trellis.api.emit('filter:column', { columnId: 'category', value: 'fruit' });
    const state = trellis.api.getState();

    expect(state.data).toHaveLength(1);
    expect(state.data[0].original.name).toBe('Bob');
  });

  it('column filter is case-insensitive', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:column', { columnId: 'city', value: 'TAIPEI' });
    const state = trellis.api.getState();

    expect(state.data).toHaveLength(2);
  });

  it('clearing one column filter preserves others', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:column', { columnId: 'city', value: 'Tokyo' });
    trellis.api.emit('filter:column', { columnId: 'category', value: 'fruit' });
    expect(trellis.api.getState().data).toHaveLength(1);

    // 清除 city 篩選，保留 category
    trellis.api.emit('filter:column', { columnId: 'city', value: '' });
    const state = trellis.api.getState();

    expect(state.filtering.columnFilters).toEqual({ category: 'fruit' });
    expect(state.data).toHaveLength(2); // Alice + Bob
  });
});

describe('Global + Column Filter Integration', () => {
  it('global query AND column filter both apply', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    // 全域搜尋含 "e" 的（Alice, Charlie, Diana）
    trellis.api.emit('filter:change', { query: 'e' });
    // 再加 city 欄篩選 Taipei（Alice, Charlie）
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    const state = trellis.api.getState();

    // 兩者 AND：含 "e" 且 city 含 "Taipei" → Alice, Charlie
    expect(state.data).toHaveLength(2);
    expect(state.data.map((r) => r.original.name)).toEqual([
      'Alice',
      'Charlie',
    ]);
  });

  it('global query and column filter with no overlap returns empty', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:change', { query: 'Bob' });
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    const state = trellis.api.getState();

    expect(state.data).toHaveLength(0);
  });

  it('clearing global query preserves column filter', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:change', { query: 'e' });
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    expect(trellis.api.getState().data).toHaveLength(2);

    trellis.api.emit('filter:change', { query: '' });
    const state = trellis.api.getState();

    // 只剩 column filter
    expect(state.filtering.columnFilters).toEqual({ city: 'Taipei' });
    expect(state.data).toHaveLength(2); // Alice, Charlie
  });

  it('clearing column filter preserves global query', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin()],
    });

    trellis.api.emit('filter:change', { query: 'e' });
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    expect(trellis.api.getState().data).toHaveLength(2);

    trellis.api.emit('filter:column', { columnId: 'city', value: '' });
    const state = trellis.api.getState();

    // 只剩 global query
    expect(state.filtering.query).toBe('e');
    // 含 "e"：Alice, Charlie, Diana
    expect(state.data).toHaveLength(3);
  });
});
