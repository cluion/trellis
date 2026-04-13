import { useState } from 'react';
import { useTrellis } from '@trellisjs/react';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { createSelectionPlugin } from '@trellisjs/plugin-selection';
import type { ColumnDef } from '@trellisjs/core';
import type { User } from '../data/mock-data';

const columns: ColumnDef<User>[] = [
  { id: 'id', accessor: 'id', header: 'ID', sortable: true, width: 60, align: 'center' },
  { id: 'name', accessor: 'name', header: '姓名', sortable: true },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'age', accessor: 'age', header: '年齡', sortable: true, width: 80, align: 'center' },
  { id: 'role', accessor: 'role', header: '職位', sortable: true },
  { id: 'city', accessor: 'city', header: '城市', sortable: true },
  { id: 'joinDate', accessor: 'joinDate', header: '入職日期', sortable: true },
];

interface FullFeatureTableProps {
  data: User[];
}

export function FullFeatureTable({ data }: FullFeatureTableProps) {
  const [query, setQuery] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const { api } = useTrellis<User>({
    data,
    columns,
    pageSize: 5,
    plugins: [
      createSortPlugin(),
      createFilterPlugin(),
      createPaginationPlugin(),
      createSelectionPlugin(),
    ],
  });

  const state = api.getState();
  const sorting = state.sorting;
  const pagination = state.pagination;
  const selection = state.selection;
  const totalCount = pagination.totalItems;
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const startIndex = totalCount > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const endIndex = totalCount > 0 ? Math.min(pagination.page * pagination.pageSize, totalCount) : 0;

  const handleSort = (columnId: string, shiftKey: boolean) => {
    const sortBy = sorting?.sortBy ?? [];
    const existing = sortBy.find((c) => c.columnId === columnId);
    const current = existing?.direction ?? null;
    const next = current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc';

    if (next === null && !shiftKey) {
      api.emit('sort:change', { columnId: '', direction: null });
    } else {
      api.emit('sort:change', { columnId, direction: next, append: shiftKey });
    }
  };

  const getSortIndicator = (columnId: string) => {
    const sortBy = sorting?.sortBy ?? [];
    const index = sortBy.findIndex((c) => c.columnId === columnId);
    if (index === -1) return ' ⇅';
    const criterion = sortBy[index];
    const arrow = criterion.direction === 'asc' ? ' ▲' : ' ▼';
    return sortBy.length > 1 ? `${arrow}${index + 1}` : arrow;
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    api.emit('filter:change', { query: value });
  };

  const handleColumnFilter = (columnId: string, value: string) => {
    setColumnFilters((prev) => {
      const next = value !== '' ? { ...prev, [columnId]: value } : (() => {
        const { [columnId]: _, ...rest } = prev;
        return rest;
      })();
      return next;
    });
    api.emit('filter:column', { columnId, value });
  };

  const allSelected = state.data.length > 0 && selection.size === state.data.length;
  const someSelected = selection.size > 0 && !allSelected;

  const handleToggleAll = () => {
    api.emit('selection:all', { select: !allSelected });
  };

  const handleToggleRow = (rowId: string | number, shiftKey: boolean, rowIndex: number) => {
    if (shiftKey) {
      api.emit('selection:range', { toIndex: rowIndex });
    } else {
      api.emit('selection:toggle', { rowId });
    }
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
          <button onClick={() => handleSearch('')} className="btn btn-sm">
            清除
          </button>
        )}
        <div className="page-size-selector">
          每頁
          <select
            value={pagination.pageSize}
            onChange={(e) => api.emit('pagination:pageSize', { pageSize: Number(e.target.value) })}
            className="select-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
          筆
        </div>
      </div>

      <div className="status-bar">
        <span>
          顯示 {startIndex}-{endIndex}，共 {totalCount} 筆
          {(sorting?.sortBy?.length ?? 0) > 0 && ` | 排序：${sorting.sortBy.map((c) => `${c.columnId} ${c.direction === 'asc' ? '↑' : '↓'}`).join(', ')}`}
          {query && ` | 搜尋："${query}"`}
          {Object.entries(columnFilters).length > 0 && ` | 欄篩選：${Object.entries(columnFilters).map(([k, v]) => `${k}="${v}"`).join(', ')}`}
          {selection.size > 0 && ` | 已選取：${selection.size} 列`}
        </span>
      </div>

      <table className="trellis-table">
        <thead>
          <tr>
            <th style={{ width: 40, textAlign: 'center' }}>
              <input
                type="checkbox"
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                checked={allSelected}
                onChange={handleToggleAll}
              />
            </th>
            {columns.map((col) => (
              <th
                key={col.id}
                style={{
                  width: col.width,
                  textAlign: col.align,
                  cursor: col.sortable !== false ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
                onClick={(e) => col.sortable !== false && handleSort(col.id, e.shiftKey)}
              >
                {String(col.header)}
                {col.sortable !== false && (
                  <span className="sort-indicator">
                    {getSortIndicator(col.id)}
                  </span>
                )}
              </th>
            ))}
          </tr>
          <tr>
            <th></th>
            {columns.map((col) => (
              <th key={`filter-${col.id}`}>
                <input
                  type="text"
                  placeholder={`篩選 ${col.header}`}
                  value={columnFilters[col.id] ?? ''}
                  onChange={(e) => handleColumnFilter(col.id, e.target.value)}
                  className="column-filter-input"
                  onClick={(e) => e.stopPropagation()}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.data.map((row, rowIndex) => (
            <tr key={row.id} style={{ background: selection.has(row.id) ? '#eff6ff' : undefined }}>
              <td style={{ textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selection.has(row.id)}
                  onChange={() => {}}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleRow(row.id, e.shiftKey, rowIndex);
                  }}
                />
              </td>
              {columns.map((col) => (
                <td key={col.id} style={{ textAlign: col.align }}>
                  {String(row.original[col.accessor as keyof User] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {state.data.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="empty-row">
                沒有符合的結果
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button
          className="btn btn-sm"
          disabled={pagination.page <= 1}
          onClick={() => api.emit('pagination:prev', null)}
        >
          上一頁
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            className={`btn btn-sm ${page === pagination.page ? 'btn-primary' : ''}`}
            onClick={() => api.emit('pagination:goto', { page })}
          >
            {page}
          </button>
        ))}
        <button
          className="btn btn-sm"
          disabled={pagination.page >= totalPages}
          onClick={() => api.emit('pagination:next', null)}
        >
          下一頁
        </button>
      </div>
    </div>
  );
}
