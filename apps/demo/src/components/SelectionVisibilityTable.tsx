import { useState, useCallback } from 'react';
import { useTrellis } from '@trellisjs/react';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { createSelectionPlugin } from '@trellisjs/plugin-selection';
import { createColumnVisibilityPlugin } from '@trellisjs/plugin-column-visibility';
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

interface SelectionVisibilityTableProps {
  data: User[];
}

export function SelectionVisibilityTable({ data }: SelectionVisibilityTableProps) {
  const [query, setQuery] = useState('');
  const { api } = useTrellis<User>({
    data,
    columns,
    pageSize: 5,
    plugins: [
      createSortPlugin(),
      createFilterPlugin(),
      createPaginationPlugin(),
      createSelectionPlugin(),
      createColumnVisibilityPlugin(),
    ],
  });

  const state = api.getState();
  const sorting = state.sorting;
  const pagination = state.pagination;
  const selection = state.selection;
  const totalPages = Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize));
  const allSelected = state.data.length > 0 && selection.size === state.data.length;
  const someSelected = selection.size > 0 && !allSelected;
  const visibleColumns = columns.filter((col) => state.columnVisibility?.[col.id] !== false);

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

  const handleDeleteSelected = useCallback(() => {
    const ids = api.getState().selection;
    ids.forEach((id) => api.removeRow(id));
  }, [api]);

  return (
    <div>
      <div className="toolbar">
        <input
          type="text"
          placeholder="搜尋..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); api.emit('filter:change', { query: e.target.value }); }}
          className="search-input"
        />
        {query && (
          <button onClick={() => { setQuery(''); api.emit('filter:change', { query: '' }); }} className="btn btn-sm">
            清除
          </button>
        )}
        {selection.size > 0 && (
          <button onClick={handleDeleteSelected} className="btn btn-sm">
            刪除選取 ({selection.size})
          </button>
        )}
        <div className="column-visibility">
          {columns.map((col) => {
            const visible = state.columnVisibility?.[col.id] !== false;
            return (
              <label key={col.id} className="column-vis-label">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={() => api.emit('column:toggle', { columnId: col.id })}
                />
                {String(col.header)}
              </label>
            );
          })}
        </div>
      </div>

      <div className="status-bar">
        <span>
          {pagination.totalItems} 筆資料
          {(sorting?.sortBy?.length ?? 0) > 0 && ` | 排序：${sorting.sortBy.map((c) => `${c.columnId} ${c.direction === 'asc' ? '↑' : '↓'}`).join(', ')}`}
          {query && ` | 搜尋："${query}"`}
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
            {visibleColumns.map((col) => (
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
              {visibleColumns.map((col) => (
                <td key={col.id} style={{ textAlign: col.align }}>
                  {String(row.original[col.accessor as keyof User] ?? '')}
                </td>
              ))}
            </tr>
          ))}
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
