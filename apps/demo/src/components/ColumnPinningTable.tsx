import { useTrellis } from '@trellisjs/react';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { createColumnPinningPlugin, calculatePinOffsets } from '@trellisjs/plugin-column-pinning';
import { createColumnVisibilityPlugin } from '@trellisjs/plugin-column-visibility';
import type { ColumnDef } from '@trellisjs/core';
import type { User } from '../data/mock-data';

const columns: ColumnDef<User>[] = [
  { id: 'id', accessor: 'id', header: 'ID', width: 60, minWidth: 60, align: 'center', pin: 'left' },
  { id: 'name', accessor: 'name', header: '姓名', width: 120, minWidth: 120, pin: 'left' },
  { id: 'email', accessor: 'email', header: 'Email', width: 200 },
  { id: 'age', accessor: 'age', header: '年齡', width: 80, align: 'center' },
  { id: 'role', accessor: 'role', header: '職位', width: 120 },
  { id: 'city', accessor: 'city', header: '城市', width: 100 },
  { id: 'joinDate', accessor: 'joinDate', header: '入職日期', width: 120 },
  { id: 'phone', accessor: 'phone', header: '電話', width: 150 },
  { id: 'address', accessor: 'address', header: '地址', width: 250 },
  { id: 'department', accessor: 'department', header: '部門', width: 120 },
  { id: 'salary', accessor: 'salary', header: '薪資', width: 100, align: 'right' },
  { id: 'actions', accessor: 'id', header: '操作', width: 100, minWidth: 100, pin: 'right' },
];

// 擴充 mock data 加入額外欄位
function enrichData(data: User[]): User[] {
  const phones = ['0912-345-678', '0923-456-789', '0934-567-890', '0945-678-901', '0956-789-012'];
  const addresses = ['台北市信義區松仁路 1 號', '台中市西屯區文心路 2 段', '高雄市苓雅區四維三路', '新竹市東區光復路 1 段', '台北市中山區南京東路 3 段'];
  const departments = ['工程部', '產品部', '設計部', '行銷部', '財務部', '人資部'];
  return data.map((user, i) => ({
    ...user,
    phone: phones[i % phones.length],
    address: addresses[i % addresses.length],
    department: departments[i % departments.length],
    salary: 40000 + Math.floor(Math.random() * 60000),
  }));
}

interface ColumnPinningTableProps {
  data: User[];
}

export function ColumnPinningTable({ data }: ColumnPinningTableProps) {
  const enrichedData = enrichData(data);
  const { api } = useTrellis<User>({
    data: enrichedData,
    columns,
    pageSize: 10,
    plugins: [
      createSortPlugin(),
      createFilterPlugin(),
      createPaginationPlugin(),
      createColumnVisibilityPlugin(),
      createColumnPinningPlugin(),
    ],
  });

  const state = api.getState();
  const pagination = state.pagination;
  const totalPages = Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize));
  const visibleColumns = columns.filter((col) => state.columnVisibility?.[col.id] !== false);
  const pinOffsets = calculatePinOffsets(state.columns, state.columnPinning, state.columnVisibility);

  return (
    <div>
      <div className="toolbar">
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
          ← 左側釘選：{state.columnPinning.left.join(', ') || '無'}
          {' | '}
          右側釘選 →：{state.columnPinning.right.join(', ') || '無'}
          {' | '}試著隱藏 ID 觀察 offset 變化
        </span>
      </div>

      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        <table className="trellis-table" style={{ minWidth: 1600 }}>
          <thead>
            <tr>
              {visibleColumns.map((col) => {
                const pinInfo = pinOffsets.get(col.id);
                return (
                  <th
                    key={col.id}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                      textAlign: col.align,
                      position: pinInfo ? 'sticky' : undefined,
                      top: 0,
                      left: pinInfo?.side === 'left' ? pinInfo.offset : undefined,
                      right: pinInfo?.side === 'right' ? pinInfo.offset : undefined,
                      background: '#fff',
                      zIndex: pinInfo ? 2 : 1,
                    }}
                    className={
                      pinInfo?.isLastLeft ? 'trellis-pin-shadow--left' :
                      pinInfo?.isFirstRight ? 'trellis-pin-shadow--right' : undefined
                    }
                  >
                    {String(col.header)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {state.data.map((row) => (
              <tr key={row.id}>
                {visibleColumns.map((col) => {
                  const pinInfo = pinOffsets.get(col.id);
                  return (
                    <td
                      key={col.id}
                      style={{
                        textAlign: col.align,
                        position: pinInfo ? 'sticky' : undefined,
                        left: pinInfo?.side === 'left' ? pinInfo.offset : undefined,
                        right: pinInfo?.side === 'right' ? pinInfo.offset : undefined,
                        background: pinInfo ? '#fff' : undefined,
                        zIndex: pinInfo ? 1 : undefined,
                      }}
                      className={
                        pinInfo?.isLastLeft ? 'trellis-pin-shadow--left' :
                        pinInfo?.isFirstRight ? 'trellis-pin-shadow--right' : undefined
                      }
                    >
                      {col.id === 'actions'
                        ? <button className="btn btn-sm" onClick={() => api.removeRow(row.id)}>刪除</button>
                        : col.id === 'salary'
                          ? `$${Number(row.original[col.accessor as keyof User]).toLocaleString()}`
                          : String(row.original[col.accessor as keyof User] ?? '')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
