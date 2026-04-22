import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('FilterPlugin debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounceMs: 0 triggers recompute immediately', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin({ debounceMs: 0 })],
    });

    trellis.api.emit('filter:change', { query: 'Taipei' });
    // No timer advancement needed — should be immediate
    const state = trellis.api.getState();
    expect(state.data).toHaveLength(2);
    expect(state.filtering.query).toBe('Taipei');
  });

  it('debounceMs: 100 batches rapid triggers into one recompute', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin({ debounceMs: 100 })],
    });

    trellis.api.emit('filter:change', { query: 'a' });
    trellis.api.emit('filter:change', { query: 'al' });
    trellis.api.emit('filter:change', { query: 'ali' });

    // Not yet executed — query stays at initial ''
    expect(trellis.api.getState().filtering.query).toBe('');

    vi.advanceTimersByTime(100);

    const state = trellis.api.getState();
    expect(state.filtering.query).toBe('ali');
    expect(state.data).toHaveLength(1);
    expect(state.data[0].original.name).toBe('Alice');
  });

  it('executes recompute after debounceMs timeout', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin({ debounceMs: 200 })],
    });

    trellis.api.emit('filter:change', { query: 'Tokyo' });
    expect(trellis.api.getState().filtering.query).toBe('');

    vi.advanceTimersByTime(200);

    const state = trellis.api.getState();
    expect(state.filtering.query).toBe('Tokyo');
    expect(state.data).toHaveLength(2);
  });

  it('destroy cancels pending timer', () => {
    const plugin = createFilterPlugin({ debounceMs: 100 });
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [plugin],
    });

    trellis.api.emit('filter:change', { query: 'fruit' });

    // Find and call destroy on the plugin
    plugin.destroy!();

    vi.advanceTimersByTime(200);

    const state = trellis.api.getState();
    // recompute was never called — state unchanged
    expect(state.filtering.query).toBe('');
    expect(state.data).toHaveLength(4);
  });

  it('mixed filter:change then filter:column resets timer and only last recompute runs', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin({ debounceMs: 100 })],
    });

    trellis.api.emit('filter:change', { query: 'e' });
    vi.advanceTimersByTime(50);
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });

    // Timer should have been reset — nothing executed yet
    expect(trellis.api.getState().data).toHaveLength(4);

    vi.advanceTimersByTime(100);

    const state = trellis.api.getState();
    // filter:column was the last event — its recompute should have run
    expect(state.filtering.columnFilters).toEqual({ city: 'Taipei' });
    // But the filter:change was superseded — query should NOT be updated
    expect(state.filtering.query).toBe('');
    expect(state.data).toHaveLength(2); // Alice, Charlie (city=Taipei)
  });

  it('destroy after filter:change silences all pending recomputes', () => {
    const plugin = createFilterPlugin({ debounceMs: 100 });
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [plugin],
    });

    trellis.api.emit('filter:change', { query: 'Alice' });
    plugin.destroy!();

    vi.advanceTimersByTime(300);

    const state = trellis.api.getState();
    expect(state.filtering.query).toBe('');
    expect(state.data).toHaveLength(4);
  });
});
