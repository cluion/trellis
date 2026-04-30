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

describe('Independent debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Task 1.2: searchDebounceMs: 300, columnDebounceMs: 0
  it('only search is debounced when columnDebounceMs is 0', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin({ searchDebounceMs: 300, columnDebounceMs: 0 })],
    });

    // filter:column should execute immediately
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    expect(trellis.api.getState().filtering.columnFilters).toEqual({ city: 'Taipei' });
    expect(trellis.api.getState().data).toHaveLength(2);

    // filter:change should be debounced
    trellis.api.emit('filter:change', { query: 'a' });
    expect(trellis.api.getState().filtering.query).toBe('');

    vi.advanceTimersByTime(300);
    expect(trellis.api.getState().filtering.query).toBe('a');
  });

  // Task 1.3: searchDebounceMs: 0, columnDebounceMs: 200
  it('only column is debounced when searchDebounceMs is 0', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin({ searchDebounceMs: 0, columnDebounceMs: 200 })],
    });

    // filter:change should execute immediately
    trellis.api.emit('filter:change', { query: 'Taipei' });
    expect(trellis.api.getState().filtering.query).toBe('Taipei');
    expect(trellis.api.getState().data).toHaveLength(2);

    // filter:column should be debounced
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Tokyo' });
    expect(trellis.api.getState().filtering.columnFilters).toEqual({});

    vi.advanceTimersByTime(200);
    expect(trellis.api.getState().filtering.columnFilters).toEqual({ city: 'Tokyo' });
  });

  // Task 1.4: both debounced independently
  it('search and column debounce independently without interfering', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin({ searchDebounceMs: 300, columnDebounceMs: 100 })],
    });

    // Trigger filter:change
    trellis.api.emit('filter:change', { query: 'a' });
    expect(trellis.api.getState().filtering.query).toBe('');

    // After 50ms, trigger filter:column
    vi.advanceTimersByTime(50);
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    expect(trellis.api.getState().filtering.columnFilters).toEqual({});

    // After another 100ms (total 150ms), column debounce fires
    vi.advanceTimersByTime(100);
    expect(trellis.api.getState().filtering.columnFilters).toEqual({ city: 'Taipei' });
    // Search still not fired yet
    expect(trellis.api.getState().filtering.query).toBe('');

    // After another 150ms (total 300ms), search debounce fires
    vi.advanceTimersByTime(150);
    expect(trellis.api.getState().filtering.query).toBe('a');
  });

  // Task 2.1: debounceMs: 300 backward compatibility
  it('debounceMs applies to both search and column (backward compatible)', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin({ debounceMs: 300 })],
    });

    trellis.api.emit('filter:change', { query: 'a' });
    expect(trellis.api.getState().filtering.query).toBe('');

    vi.advanceTimersByTime(300);
    expect(trellis.api.getState().filtering.query).toBe('a');

    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    expect(trellis.api.getState().filtering.columnFilters).toEqual({});

    vi.advanceTimersByTime(300);
    expect(trellis.api.getState().filtering.columnFilters).toEqual({ city: 'Taipei' });
  });

  // Task 2.2: specific overrides general
  it('searchDebounceMs overrides debounceMs for search only', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin({ debounceMs: 300, searchDebounceMs: 500 })],
    });

    // Search uses 500ms (specific override)
    trellis.api.emit('filter:change', { query: 'a' });
    vi.advanceTimersByTime(300);
    expect(trellis.api.getState().filtering.query).toBe('');

    vi.advanceTimersByTime(200);
    expect(trellis.api.getState().filtering.query).toBe('a');

    // Column uses 300ms (from debounceMs)
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    vi.advanceTimersByTime(300);
    expect(trellis.api.getState().filtering.columnFilters).toEqual({ city: 'Taipei' });
  });

  // Task 2.3: complete override
  it('specific options completely override debounceMs', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin({ debounceMs: 300, searchDebounceMs: 0, columnDebounceMs: 100 })],
    });

    // searchDebounceMs: 0 → immediate
    trellis.api.emit('filter:change', { query: 'a' });
    expect(trellis.api.getState().filtering.query).toBe('a');

    // columnDebounceMs: 100 → debounced
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });
    expect(trellis.api.getState().filtering.columnFilters).toEqual({});

    vi.advanceTimersByTime(100);
    expect(trellis.api.getState().filtering.columnFilters).toEqual({ city: 'Taipei' });
  });

  // Spec: destroy cancels both timers
  it('destroy cancels both search and column pending timers', () => {
    const plugin = createFilterPlugin({ searchDebounceMs: 300, columnDebounceMs: 200 });
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [plugin],
    });

    trellis.api.emit('filter:change', { query: 'Alice' });
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });

    plugin.destroy!();

    vi.advanceTimersByTime(500);

    const state = trellis.api.getState();
    expect(state.filtering.query).toBe('');
    expect(state.filtering.columnFilters).toEqual({});
    expect(state.data).toHaveLength(4);
  });

  // Spec: column debounce independent with multiple triggers
  it('column debounce only executes last column filter', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createFilterPlugin({ columnDebounceMs: 200 })],
    });

    trellis.api.emit('filter:column', { columnId: 'city', value: 'T' });
    trellis.api.emit('filter:column', { columnId: 'city', value: 'To' });
    trellis.api.emit('filter:column', { columnId: 'city', value: 'Tokyo' });

    vi.advanceTimersByTime(200);

    const state = trellis.api.getState();
    expect(state.filtering.columnFilters).toEqual({ city: 'Tokyo' });
    expect(state.data).toHaveLength(2);
  });
});
