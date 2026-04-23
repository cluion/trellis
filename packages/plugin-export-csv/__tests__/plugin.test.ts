import { describe, it, expect, vi } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createExportCSVPlugin } from '../src/export-csv-plugin';

interface User {
  name: string;
  email: string;
  city: string;
}

const data: User[] = [
  { name: 'Alice', email: 'alice@test.com', city: '台北' },
  { name: 'Bob', email: 'bob@test.com', city: '台中' },
  { name: 'Charlie', email: 'charlie@test.com', city: '高雄' },
];

const columns = [
  { id: 'name', accessor: 'name' as const, header: 'Name' },
  { id: 'email', accessor: 'email' as const, header: 'Email' },
  { id: 'city', accessor: 'city' as const, header: 'City' },
];

function createTrellisWithExport(pageSize = 10, withPagination = false) {
  const plugins = [createExportCSVPlugin()];
  if (withPagination) {
    plugins.push({
      name: 'pagination',
      install: (api: { registerTransform: (name: string, priority: number, fn: (data: unknown, state: unknown) => unknown) => void }) => {
        api.registerTransform('pagination', 30, (data: unknown, state: unknown) => {
          const d = data as { length: number; slice: (start: number, end: number) => unknown[] };
          const s = state as { pagination: { page: number; pageSize: number } };
          const start = (s.pagination.page - 1) * s.pagination.pageSize;
          return d.slice(start, start + s.pagination.pageSize);
        });
      },
    });
  }
  return new Trellis<User>({
    data,
    columns,
    pageSize,
    plugins,
  });
}

describe('export-csv plugin', () => {
  it('export:csv-string returns CSV via callback', () => {
    const trellis = createTrellisWithExport();
    const callback = vi.fn();
    trellis.api.emit('export:csv-string', { callback });

    expect(callback).toHaveBeenCalledOnce();
    const csv = callback.mock.calls[0][0] as string;
    expect(csv.split('\n')[0]).toBe('Name,Email,City');
  });

  it('export:csv-string with currentPageOnly: true returns only current page', () => {
    const trellis = createTrellisWithExport(2, true);
    const callback = vi.fn();
    trellis.api.emit('export:csv-string', {
      callback,
      options: { currentPageOnly: true },
    });

    const csv = callback.mock.calls[0][0] as string;
    const lines = csv.split('\n');
    // header + 2 rows (page 1, pageSize 2)
    expect(lines).toHaveLength(3);
  });

  it('export:csv-string with currentPageOnly: false returns all data', () => {
    const trellis = createTrellisWithExport(2, true);
    const callback = vi.fn();
    trellis.api.emit('export:csv-string', {
      callback,
      options: { currentPageOnly: false },
    });

    const csv = callback.mock.calls[0][0] as string;
    const lines = csv.split('\n');
    // header + 3 rows (all data)
    expect(lines).toHaveLength(4);
  });

  it('export:csv-string with custom columns', () => {
    const trellis = createTrellisWithExport();
    const callback = vi.fn();
    trellis.api.emit('export:csv-string', {
      callback,
      options: { columns: ['name', 'email'] },
    });

    const csv = callback.mock.calls[0][0] as string;
    expect(csv.split('\n')[0]).toBe('Name,Email');
  });

  it('export:csv-string with includeHeader: false', () => {
    const trellis = createTrellisWithExport();
    const callback = vi.fn();
    trellis.api.emit('export:csv-string', {
      callback,
      options: { includeHeader: false },
    });

    const csv = callback.mock.calls[0][0] as string;
    const lines = csv.split('\n');
    // 3 data rows, no header
    expect(lines).toHaveLength(3);
  });
});
