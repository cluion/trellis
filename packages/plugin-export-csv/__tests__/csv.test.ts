import { describe, it, expect } from 'vitest';
import { escapeCSVValue, toCSV } from '../src/export-csv-plugin';
import type { ColumnDef, DataRow } from '@trellisjs/core';

interface Row {
  name: string;
  email: string;
  note?: string | null;
}

const columns: ColumnDef<Row>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'note', accessor: 'note', header: 'Note' },
];

function makeRow(data: Row, index: number): DataRow<Row> {
  return { id: String(index), original: data, index };
}

describe('escapeCSVValue', () => {
  it('returns empty string for null', () => {
    expect(escapeCSVValue(null, ',')).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeCSVValue(undefined, ',')).toBe('');
  });

  it('quotes value containing comma', () => {
    expect(escapeCSVValue('Hello, World', ',')).toBe('"Hello, World"');
  });

  it('quotes value containing double quotes and doubles them', () => {
    expect(escapeCSVValue('He said "yes"', ',')).toBe('"He said ""yes"""');
  });

  it('quotes value containing newline', () => {
    expect(escapeCSVValue('line1\nline2', ',')).toBe('"line1\nline2"');
  });

  it('quotes value containing carriage return', () => {
    expect(escapeCSVValue('line1\r\nline2', ',')).toBe('"line1\r\nline2"');
  });

  it('does not quote simple value', () => {
    expect(escapeCSVValue('hello', ',')).toBe('hello');
  });

  it('handles numbers', () => {
    expect(escapeCSVValue(42, ',')).toBe('42');
  });

  it('respects custom delimiter in quoting', () => {
    expect(escapeCSVValue('hello\tworld', '\t')).toBe('"hello\tworld"');
  });
});

describe('toCSV', () => {
  it('produces header + data rows', () => {
    const rows = [
      makeRow({ name: 'Alice', email: 'alice@test.com', note: undefined }, 0),
      makeRow({ name: 'Bob', email: 'bob@test.com', note: undefined }, 1),
    ];
    const csv = toCSV(rows, columns);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Name,Email,Note');
    expect(lines[1]).toBe('Alice,alice@test.com,');
    expect(lines[2]).toBe('Bob,bob@test.com,');
  });

  it('omits header when includeHeader: false', () => {
    const rows = [makeRow({ name: 'Alice', email: 'a@t.com', note: undefined }, 0)];
    const csv = toCSV(rows, columns, { includeHeader: false });
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Alice,a@t.com,');
  });

  it('returns empty string for empty dataset with includeHeader: false', () => {
    const csv = toCSV([], columns, { includeHeader: false });
    expect(csv).toBe('');
  });

  it('returns header only for empty dataset with includeHeader: true', () => {
    const csv = toCSV([], columns);
    expect(csv).toBe('Name,Email,Note');
  });

  it('uses custom delimiter', () => {
    const rows = [makeRow({ name: 'Alice', email: 'a@t.com', note: undefined }, 0)];
    const csv = toCSV(rows, columns, { delimiter: '\t' });
    expect(csv.split('\n')[0]).toBe('Name\tEmail\tNote');
  });

  it('exports only selected columns', () => {
    const rows = [makeRow({ name: 'Alice', email: 'a@t.com', note: undefined }, 0)];
    const csv = toCSV(rows, columns, { columns: ['name', 'email'] });
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Name,Email');
    expect(lines[1]).toBe('Alice,a@t.com');
  });

  it('excludes columns with visible: false by default', () => {
    const cols: ColumnDef<Row>[] = [
      { id: 'name', accessor: 'name', header: 'Name' },
      { id: 'email', accessor: 'email', header: 'Email' },
      { id: 'secret', accessor: 'name', header: 'Secret', visible: false },
    ];
    const rows = [makeRow({ name: 'Alice', email: 'a@t.com', note: undefined }, 0)];
    const csv = toCSV(rows, cols);
    expect(csv.split('\n')[0]).toBe('Name,Email');
  });

  it('includes visible: false column when explicitly selected', () => {
    const cols: ColumnDef<Row>[] = [
      { id: 'name', accessor: 'name', header: 'Name' },
      { id: 'secret', accessor: 'name', header: 'Secret', visible: false },
    ];
    const rows = [makeRow({ name: 'Alice', email: 'a@t.com', note: undefined }, 0)];
    const csv = toCSV(rows, cols, { columns: ['name', 'secret'] });
    expect(csv.split('\n')[0]).toBe('Name,Secret');
  });

  it('returns empty string when no columns match', () => {
    const rows = [makeRow({ name: 'Alice', email: 'a@t.com', note: undefined }, 0)];
    const csv = toCSV(rows, columns, { columns: ['nonexistent'] });
    expect(csv).toBe('');
  });

  it('handles special characters in values', () => {
    const rows = [
      makeRow({ name: 'He said "yes"', email: 'a,b@test.com', note: 'line1\nline2' }, 0),
    ];
    const csv = toCSV(rows, columns);
    expect(csv).toBe(
      'Name,Email,Note\n"He said ""yes""","a,b@test.com","line1\nline2"',
    );
  });
});
