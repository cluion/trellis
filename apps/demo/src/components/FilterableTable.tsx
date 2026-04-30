import { useState } from 'react';
import { useTrellis } from '@trellisjs/react';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import type { ColumnDef } from '@trellisjs/core';
import type { User } from '../data/mock-data';

const columns: ColumnDef<User>[] = [
  { id: 'id', accessor: 'id', header: 'ID', width: 60, align: 'center' },
  { id: 'name', accessor: 'name', header: '姓名' },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'age', accessor: 'age', header: '年齡', width: 80, align: 'center' },
  { id: 'role', accessor: 'role', header: '職位' },
  { id: 'city', accessor: 'city', header: '城市' },
];

interface FilterableTableProps {
  data: User[];
}

export function FilterableTable({ data }: FilterableTableProps) {
  const [query, setQuery] = useState('');
  const { api } = useTrellis<User>({
    data,
    columns,
    plugins: [createFilterPlugin({ searchDebounceMs: 300, columnDebounceMs: 100 })],
  });

  const state = api.getState();

  const handleSearch = (value: string) => {
    setQuery(value);
    api.emit('filter:change', { query: value });
  };

  const clearSearch = () => {
    setQuery('');
    api.emit('filter:change', { query: '' });
  };

  return (
    <div>
      <div className="toolbar">
        <input
          type="text"
          placeholder="搜尋所有欄位..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
        {query && (
          <button onClick={clearSearch} className="btn btn-sm">
            清除
          </button>
        )}
        <span className="info">
          找到 {state.data.length} 筆結果
        </span>
      </div>
      <table className="trellis-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.id} style={{ width: col.width, textAlign: col.align }}>
                {String(col.header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.data.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.id} style={{ textAlign: col.align }}>
                  {String(row.original[col.accessor as keyof User] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {state.data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="empty-row">
                沒有符合的結果
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
