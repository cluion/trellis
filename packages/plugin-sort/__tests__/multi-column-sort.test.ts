import { describe, it, expect } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createSortPlugin } from '../src/sort-plugin';
import type { ColumnDef } from '@trellisjs/core';

interface Item {
  city: string;
  age: number;
  name: string;
}

const data: Item[] = [
  { city: 'Taipei', age: 30, name: 'Alice' },
  { city: 'Taipei', age: 25, name: 'Bob' },
  { city: 'Tokyo', age: 35, name: 'Charlie' },
  { city: 'Tokyo', age: 20, name: 'Diana' },
  { city: 'Taipei', age: 28, name: 'Eve' },
];

const columns: ColumnDef<Item>[] = [
  { id: 'city', accessor: 'city', header: 'City' },
  { id: 'age', accessor: 'age', header: 'Age' },
  { id: 'name', accessor: 'name', header: 'Name' },
];

describe('MultiColumnSort', () => {
  it('initial state has empty sortBy', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    expect(trellis.api.getState().sorting.sortBy).toEqual([]);
  });

  it('replace mode sets single criterion', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'city', direction: 'asc' });
    const state = trellis.api.getState();

    expect(state.sorting.sortBy).toEqual([
      { columnId: 'city', direction: 'asc' },
    ]);
  });

  it('append mode adds second criterion', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'city', direction: 'asc' });
    trellis.api.emit('sort:change', { columnId: 'age', direction: 'desc', append: true });
    const state = trellis.api.getState();

    expect(state.sorting.sortBy).toEqual([
      { columnId: 'city', direction: 'asc' },
      { columnId: 'age', direction: 'desc' },
    ]);
  });

  it('append existing column moves it to end with new direction', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'city', direction: 'asc' });
    trellis.api.emit('sort:change', { columnId: 'age', direction: 'desc', append: true });
    trellis.api.emit('sort:change', { columnId: 'city', direction: 'desc', append: true });
    const state = trellis.api.getState();

    expect(state.sorting.sortBy).toEqual([
      { columnId: 'age', direction: 'desc' },
      { columnId: 'city', direction: 'desc' },
    ]);
  });

  it('clears all sorting with direction=null and append=false', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'city', direction: 'asc' });
    trellis.api.emit('sort:change', { columnId: 'age', direction: 'desc', append: true });
    trellis.api.emit('sort:change', { columnId: '', direction: null });
    const state = trellis.api.getState();

    expect(state.sorting.sortBy).toEqual([]);
  });

  it('removes single column sorting with direction=null and append=true', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'city', direction: 'asc' });
    trellis.api.emit('sort:change', { columnId: 'age', direction: 'desc', append: true });
    trellis.api.emit('sort:change', { columnId: 'city', direction: null, append: true });
    const state = trellis.api.getState();

    expect(state.sorting.sortBy).toEqual([
      { columnId: 'age', direction: 'desc' },
    ]);
  });

  it('sorts by primary then secondary criterion', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'city', direction: 'asc' });
    trellis.api.emit('sort:change', { columnId: 'age', direction: 'desc', append: true });
    const state = trellis.api.getState();

    // Taipei: age 30, 28, 25 → desc: 30, 28, 25
    // Tokyo: age 35, 20 → desc: 35, 20
    expect(state.data.map((r) => `${r.original.city}:${r.original.age}`)).toEqual([
      'Taipei:30',
      'Taipei:28',
      'Taipei:25',
      'Tokyo:35',
      'Tokyo:20',
    ]);
  });

  it('replace mode discards existing multi-column sort', () => {
    const trellis = new Trellis<Item>({
      data,
      columns,
      plugins: [createSortPlugin()],
    });

    trellis.api.emit('sort:change', { columnId: 'city', direction: 'asc' });
    trellis.api.emit('sort:change', { columnId: 'age', direction: 'desc', append: true });
    trellis.api.emit('sort:change', { columnId: 'name', direction: 'asc' });
    const state = trellis.api.getState();

    expect(state.sorting.sortBy).toEqual([
      { columnId: 'name', direction: 'asc' },
    ]);
  });
});
