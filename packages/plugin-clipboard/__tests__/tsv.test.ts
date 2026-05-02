import { describe, it, expect } from 'vitest';
import { toTSV, parseTSV } from '../src/clipboard-plugin';
import type { ColumnDef, DataRow } from '@trellisjs/core';

interface Row {
  name: string;
  email: string;
  age: number;
}

const columns: ColumnDef<Row>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'age', accessor: 'age', header: 'Age' },
];

function makeRow(data: Row, index: number): DataRow<Row> {
  return { id: String(index), original: data, index };
}

describe('toTSV', () => {
  it('converts rows to tab-separated text with headers by default', () => {
    const rows = [
      makeRow({ name: 'Alice', email: 'alice@test.com', age: 30 }, 0),
      makeRow({ name: 'Bob', email: 'bob@test.com', age: 25 }, 1),
    ];
    const tsv = toTSV(rows, columns);
    const lines = tsv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Name\tEmail\tAge');
    expect(lines[1]).toBe('Alice\talice@test.com\t30');
    expect(lines[2]).toBe('Bob\tbob@test.com\t25');
  });

  it('includes headers when copyHeaders is true', () => {
    const rows = [makeRow({ name: 'Alice', email: 'a@t.com', age: 30 }, 0)];
    const tsv = toTSV(rows, columns, { copyHeaders: true });
    expect(tsv.split('\n')[0]).toBe('Name\tEmail\tAge');
  });

  it('excludes headers when copyHeaders is false', () => {
    const rows = [makeRow({ name: 'Alice', email: 'a@t.com', age: 30 }, 0)];
    const tsv = toTSV(rows, columns, { copyHeaders: false });
    const lines = tsv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Alice\ta@t.com\t30');
  });

  it('returns empty string when no visible columns', () => {
    const hiddenCols: ColumnDef<Row>[] = [
      { id: 'name', accessor: 'name', header: 'Name', visible: false },
    ];
    const rows = [makeRow({ name: 'Alice', email: 'a@t.com', age: 30 }, 0)];
    expect(toTSV(rows, hiddenCols)).toBe('');
  });

  it('uses custom delimiter', () => {
    const rows = [makeRow({ name: 'Alice', email: 'a@t.com', age: 30 }, 0)];
    const tsv = toTSV(rows, columns, { delimiter: ',' });
    expect(tsv.split('\n')[0]).toBe('Name,Email,Age');
  });

  it('uses custom headerAccessor', () => {
    const rows = [makeRow({ name: 'Alice', email: 'a@t.com', age: 30 }, 0)];
    const tsv = toTSV(rows, columns, {
      headerAccessor: (col) => col.id.toUpperCase(),
    });
    expect(tsv.split('\n')[0]).toBe('NAME\tEMAIL\tAGE');
  });

  it('handles null/undefined values as empty string', () => {
    interface Nullable {
      a: string | null;
      b: string | undefined;
    }
    const cols: ColumnDef<Nullable>[] = [
      { id: 'a', accessor: 'a', header: 'A' },
      { id: 'b', accessor: 'b', header: 'B' },
    ];
    const rows = [{ id: '0', original: { a: null, b: undefined }, index: 0 }];
    const tsv = toTSV(rows as DataRow[], cols);
    expect(tsv.split('\n')[1]).toBe('\t');
  });
});

describe('parseTSV', () => {
  it('parses TSV text into record array using column ids', () => {
    const text = 'Alice\t30\nBob\t25';
    const cols: ColumnDef[] = [
      { id: 'name', accessor: 'name', header: 'Name' },
      { id: 'age', accessor: 'age', header: 'Age' },
    ];
    const result = parseTSV(text, cols);
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('skips header row when it matches column headers (case-insensitive)', () => {
    const text = 'Name\tAge\nAlice\t30';
    const cols: ColumnDef[] = [
      { id: 'name', accessor: 'name', header: 'Name' },
      { id: 'age', accessor: 'age', header: 'Age' },
    ];
    const result = parseTSV(text, cols);
    expect(result).toEqual([{ name: 'Alice', age: '30' }]);
  });

  it('does not skip header row when it does not match', () => {
    const text = 'Alice\t30\nBob\t25';
    const cols: ColumnDef[] = [
      { id: 'name', accessor: 'name', header: 'Name' },
      { id: 'age', accessor: 'age', header: 'Age' },
    ];
    const result = parseTSV(text, cols);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty text', () => {
    const cols: ColumnDef[] = [
      { id: 'name', accessor: 'name', header: 'Name' },
    ];
    expect(parseTSV('', cols)).toEqual([]);
  });

  it('returns empty array for whitespace-only text', () => {
    const cols: ColumnDef[] = [
      { id: 'name', accessor: 'name', header: 'Name' },
    ];
    expect(parseTSV('   \n  \n  ', cols)).toEqual([]);
  });

  it('handles fewer fields than columns by padding with empty string', () => {
    const text = 'Alice';
    const cols: ColumnDef[] = [
      { id: 'name', accessor: 'name', header: 'Name' },
      { id: 'age', accessor: 'age', header: 'Age' },
    ];
    const result = parseTSV(text, cols);
    expect(result).toEqual([{ name: 'Alice', age: '' }]);
  });

  it('handles more fields than columns by ignoring extras', () => {
    const text = 'Alice\t30\textra';
    const cols: ColumnDef[] = [
      { id: 'name', accessor: 'name', header: 'Name' },
      { id: 'age', accessor: 'age', header: 'Age' },
    ];
    const result = parseTSV(text, cols);
    expect(result).toEqual([{ name: 'Alice', age: '30' }]);
  });

  it('uses custom delimiter', () => {
    const text = 'Alice,30\nBob,25';
    const cols: ColumnDef[] = [
      { id: 'name', accessor: 'name', header: 'Name' },
      { id: 'age', accessor: 'age', header: 'Age' },
    ];
    const result = parseTSV(text, cols, { delimiter: ',' });
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });
});
