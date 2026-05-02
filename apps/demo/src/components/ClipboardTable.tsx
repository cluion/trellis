import { useState, useCallback, useEffect } from 'react';
import { useTrellis } from '@trellisjs/react';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { createSelectionPlugin } from '@trellisjs/plugin-selection';
import { createClipboardPlugin } from '@trellisjs/plugin-clipboard';
import type { ColumnDef } from '@trellisjs/core';
import type { User } from '../data/mock-data';

const columns: ColumnDef<User>[] = [
  { id: 'id', accessor: 'id', header: 'ID', sortable: true, width: 60, align: 'center' },
  { id: 'name', accessor: 'name', header: '姓名', sortable: true },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'age', accessor: 'age', header: '年齡', sortable: true, width: 80, align: 'center' },
  { id: 'role', accessor: 'role', header: '職位', sortable: true },
  { id: 'city', accessor: 'city', header: '城市', sortable: true },
];

interface ClipboardTableProps {
  data: User[];
}

export function ClipboardTable({ data }: ClipboardTableProps) {
  const [query, setQuery] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-9), msg]);
  }, []);

  const { api } = useTrellis<User>({
    data,
    columns,
    pageSize: 5,
    plugins: [
      createSortPlugin(),
      createFilterPlugin(),
      createPaginationPlugin(),
      createSelectionPlugin(),
      createClipboardPlugin(),
    ],
  });

  const state = api.getState();
  const sorting = state.sorting;
  const pagination = state.pagination;
  const selection = state.selection;
  const totalPages = Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize));
  const allSelected = state.data.length > 0 && selection.size === state.data.length;
  const someSelected = selection.size > 0 && !allSelected;

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

  useEffect(() => {
    const off1 = api.on('clipboard:copied', (payload) => {
      addLog(`已複製 ${payload.rows.length} 行到剪貼簿`);
    });
    const off2 = api.on('clipboard:paste', (payload) => {
      addLog(`偵測到貼上：${payload.rows.length} 行`);
    });
    const off3 = api.on('clipboard:error', (payload) => {
      addLog(`錯誤 (${payload.action}): ${payload.error.message}`);
    });
    return () => { off1(); off2(); off3(); };
  }, [api, addLog]);

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
        <button onClick={() => api.emit('clipboard:copy', undefined)} className="btn btn-sm">
          複製 {selection.size > 0 ? `(${selection.size} 行)` : '(全部)'}
        </button>
        <span className="info" style={{ fontSize: '0.85em', color: '#888' }}>
          快捷鍵：Ctrl/Cmd+C 複製、Ctrl/Cmd+V 貼上
        </span>
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

      {log.length > 0 && (
        <div style={{ marginTop: 12, padding: 8, background: '#f8f9fa', borderRadius: 4, fontSize: '0.85em' }}>
          <strong>事件日誌：</strong>
          {log.map((msg, i) => (
            <div key={i} style={{ color: '#555' }}>{msg}</div>
          ))}
        </div>
      )}
    </div>
  );
}
