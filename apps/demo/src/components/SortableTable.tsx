import { useTrellis } from '@trellisjs/react';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import type { ColumnDef } from '@trellisjs/core';
import type { User } from '../data/mock-data';

const columns: ColumnDef<User>[] = [
  { id: 'id', accessor: 'id', header: 'ID', sortable: true, width: 60, align: 'center' },
  { id: 'name', accessor: 'name', header: '姓名', sortable: true },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'age', accessor: 'age', header: '年齡', sortable: true, width: 80, align: 'center' },
  { id: 'role', accessor: 'role', header: '職位', sortable: true },
  { id: 'city', accessor: 'city', header: '城市', sortable: false },
  { id: 'joinDate', accessor: 'joinDate', header: '入職日期', sortable: true },
];

interface SortableTableProps {
  data: User[];
}

export function SortableTable({ data }: SortableTableProps) {
  const { api } = useTrellis<User>({
    data,
    columns,
    plugins: [createSortPlugin()],
  });

  const state = api.getState();
  const sorting = state.sorting;

  const handleSort = (columnId: string) => {
    const current = sorting?.columnId === columnId ? sorting.direction : null;
    const next = current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc';
    api.emit('sort:change', { columnId, direction: next });
  };

  return (
    <div>
      <p className="info">
        {sorting?.columnId
          ? `排序：${sorting.columnId} (${sorting.direction === 'asc' ? '升序' : '降序'})`
          : '點擊表頭排序（城市欄不可排序）'}
      </p>
      <table className="trellis-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                style={{
                  width: col.width,
                  textAlign: col.align,
                  cursor: col.sortable !== false ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
                onClick={() => col.sortable !== false && handleSort(col.id)}
              >
                {String(col.header)}
                {col.sortable !== false && (
                  <span className="sort-indicator">
                    {sorting?.columnId === col.id
                      ? sorting.direction === 'asc'
                        ? ' ▲'
                        : ' ▼'
                      : ' ⇅'}
                  </span>
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
    </div>
  );
}
