import { useTrellis } from '@trellisjs/react';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
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

interface PaginatedTableProps {
  data: User[];
}

export function PaginatedTable({ data }: PaginatedTableProps) {
  const { api } = useTrellis<User>({
    data,
    columns,
    pageSize: 5,
    plugins: [createPaginationPlugin()],
  });

  const state = api.getState();
  const pagination = state.pagination;
  const totalCount = pagination.totalItems;
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const startIndex = totalCount > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const endIndex = totalCount > 0 ? Math.min(pagination.page * pagination.pageSize, totalCount) : 0;

  const gotoPage = (page: number) => {
    api.emit('pagination:goto', { page });
  };

  return (
    <div>
      <div className="toolbar">
        <span className="info">
          顯示第 {startIndex}-{endIndex} 筆，共 {totalCount} 筆
        </span>
        <div className="page-size-selector">
          每頁
          <select
            value={pagination.pageSize}
            onChange={(e) => api.emit('pagination:pageSize', { pageSize: Number(e.target.value) })}
            className="select-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          筆
        </div>
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
            onClick={() => gotoPage(page)}
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
