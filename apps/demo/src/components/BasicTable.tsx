import { useTrellis } from '@trellisjs/react';
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

interface BasicTableProps {
  data: User[];
}

export function BasicTable({ data }: BasicTableProps) {
  const { api } = useTrellis<User>({
    data,
    columns,
  });

  const state = api.getState();

  return (
    <div>
      <p className="info">
        共 {state.data.length} 筆資料，{columns.length} 個欄位
      </p>
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
    </div>
  );
}
