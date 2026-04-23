import { useTrellis } from '@trellisjs/react';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { createRowExpansionPlugin } from '@trellisjs/plugin-row-expansion';
import { createExportCSVPlugin } from '@trellisjs/plugin-export-csv';
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

interface RowExpansionTableProps {
  data: User[];
}

function ExpansionDetail({ row }: { row: User }) {
  return (
    <div style={{ padding: '12px 16px', background: '#f8f9fa' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div>
          <strong>入職日期：</strong>{row.joinDate}
        </div>
        <div>
          <strong>Email：</strong>{row.email}
        </div>
        <div>
          <strong>年齡：</strong>{row.age}
        </div>
      </div>
      <div style={{ marginTop: '8px', padding: '8px', background: '#e9ecef', borderRadius: '4px' }}>
        <strong>完整資訊：</strong>
        {row.name}（{row.role}）於 {row.joinDate} 加入，目前在 {row.city} 辦公。
      </div>
    </div>
  );
}

export function RowExpansionTable({ data }: RowExpansionTableProps) {
  const { api } = useTrellis<User>({
    data,
    columns,
    pageSize: 10,
    plugins: [
      createSortPlugin(),
      createFilterPlugin(),
      createPaginationPlugin(),
      createRowExpansionPlugin({ mode: 'multi' }),
      createExportCSVPlugin(),
    ],
  });

  // Register expansion slot
  api.registerSlot('expansion:default', (ctx) => {
    const user = ctx.row as User;
    return <ExpansionDetail row={user} />;
  });

  const state = api.getState();
  const pagination = state.pagination;
  const totalPages = Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize));
  const expandedCount = state.expandedRows.size;

  return (
    <div>
      <div className="toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="搜尋..."
          value={state.filtering.query}
          onChange={(e) => api.recompute({ filtering: { query: e.target.value, columnFilters: {} } })}
        />
        <button
          onClick={() => api.emit('export:csv', { filename: 'current-page.csv', currentPageOnly: true })}
          className="btn btn-sm"
        >
          匯出當前頁
        </button>
        <span className="status-bar">
          展開 {expandedCount} 行 | 模式：multi（可同時展開多行）
        </span>
      </div>

      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        <table className="trellis-table">
          <thead>
            <tr>
              <th className="trellis-expansion-th" />
              {columns.map((col) => (
                <th
                  key={col.id}
                  style={{ width: col.width, textAlign: col.align, cursor: 'pointer' }}
                  onClick={() => {
                    const current = state.sorting.sortBy;
                    const existing = current.find((s) => s.columnId === col.id);
                    const direction = existing?.direction === 'asc' ? 'desc' : 'asc';
                    api.recompute({
                      sorting: { sortBy: [{ columnId: col.id, direction }] },
                    });
                  }}
                >
                  {String(col.header)}
                  {state.sorting.sortBy[0]?.columnId === col.id && (
                    state.sorting.sortBy[0].direction === 'asc' ? ' ↑' : ' ↓'
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.data.map((row) => {
              const isExpanded = state.expandedRows.has(row.id);
              return (
                <Fragment key={row.id}>
                  <tr>
                    <td className="trellis-expansion-td">
                      <button
                        type="button"
                        className="trellis-expansion-toggle"
                        onClick={() => api.emit('expansion:toggle', { rowId: row.id })}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? '收合' : '展開'}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </td>
                    {columns
                      .filter((col) => col.visible !== false)
                      .map((col) => (
                        <td key={col.id} style={{ textAlign: col.align }}>
                          {String(row.original[col.accessor as keyof User] ?? '')}
                        </td>
                      ))}
                  </tr>
                  {isExpanded && (
                    <tr className="trellis-expansion-row trellis-expansion--expanded"
                        onClick={(e) => e.stopPropagation()}>
                      <td colSpan={columns.length + 1} className="trellis-expansion-cell">
                        <ExpansionDetail row={row.original as User} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          className="btn btn-sm"
          disabled={pagination.page <= 1}
          onClick={() => api.recompute({ pagination: { ...pagination, page: pagination.page - 1 } })}
        >
          上一頁
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            className={`btn btn-sm ${page === pagination.page ? 'btn-primary' : ''}`}
            onClick={() => api.recompute({ pagination: { ...pagination, page } })}
          >
            {page}
          </button>
        ))}
        <button
          className="btn btn-sm"
          disabled={pagination.page >= totalPages}
          onClick={() => api.recompute({ pagination: { ...pagination, page: pagination.page + 1 } })}
        >
          下一頁
        </button>
      </div>
    </div>
  );
}

import { Fragment } from 'react';
