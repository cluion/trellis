import { useTrellis } from '@trellisjs/react';
import { createColumnResizingPlugin } from '@trellisjs/plugin-column-resizing';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import type { ColumnDef } from '@trellisjs/core';
import type { User } from '../data/mock-data';

const columns: ColumnDef<User>[] = [
  { id: 'id', accessor: 'id', header: 'ID', width: 60, align: 'center' },
  { id: 'name', accessor: 'name', header: '姓名' },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'age', accessor: 'age', header: '年齡', width: 80, align: 'center' },
  { id: 'role', accessor: 'role', header: '職位' },
  { id: 'city', accessor: 'city', header: '城市', resizable: false },
];

interface ColumnResizingTableProps {
  data: User[];
}

export function ColumnResizingTable({ data }: ColumnResizingTableProps) {
  const { api } = useTrellis<User>({
    data,
    columns,
    pageSize: 5,
    plugins: [
      createColumnResizingPlugin({ minWidth: 40, maxWidth: 600, defaultWidth: 150 }),
      createSortPlugin(),
      createPaginationPlugin(),
    ],
  });

  const state = api.getState();
  const pagination = state.pagination;
  const totalPages = Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize));
  const sorting = state.sorting;
  const resizing = state.columnResizing;
  const columnWidths = resizing?.columnWidths ?? {};

  const handleSort = (columnId: string) => {
    const sortBy = sorting?.sortBy ?? [];
    const existing = sortBy.find((c) => c.columnId === columnId);
    const current = existing?.direction ?? null;
    const next = current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc';
    api.emit('sort:change', { columnId, direction: next });
  };

  const getSortIndicator = (columnId: string) => {
    const sortBy = sorting?.sortBy ?? [];
    const criterion = sortBy.find((c) => c.columnId === columnId);
    if (!criterion) return '';
    return criterion.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const handleMouseDown = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    // 使用實際 DOM 寬度而非 defaultWidth，避免點擊時跳到錯誤寬度
    const th = (e.target as HTMLElement).closest('th');
    const currentWidth = th?.getBoundingClientRect().width ?? columnWidths[columnId] ?? resizing?.defaultWidth ?? 150;

    api.emit('resize:start', { columnId });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = currentWidth + delta;
      api.emit('resize:column', { columnId, width: newWidth });
    };

    const handleMouseUp = () => {
      api.emit('resize:end', undefined);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const getColumnWidth = (col: ColumnDef<User>) => {
    if (columnWidths[col.id]) return columnWidths[col.id];
    return col.width;
  };

  return (
    <div>
      <div className="status-bar">
        <span>
          拖曳表頭右側邊緣調整欄寬 | 城市（resizable: false）不可調整
          {Object.keys(columnWidths).length > 0 && ` | 已調整：${Object.entries(columnWidths).map(([k, v]) => `${k}=${v}px`).join(', ')}`}
        </span>
        <button
          className="btn btn-sm"
          onClick={() => api.emit('resize:reset', undefined)}
        >
          重置欄寬
        </button>
      </div>

      <table className="trellis-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                style={{
                  width: getColumnWidth(col),
                  textAlign: col.align,
                  position: 'relative',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort(col.id)}
              >
                {String(col.header)}
                {getSortIndicator(col.id)}
                {col.resizable !== false && (
                  <div
                    className="trellis-resize-handle"
                    onMouseDown={(e) => handleMouseDown(col.id, e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
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
